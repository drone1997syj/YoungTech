import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
const databaseConfig = databaseUrl
  ? { uri: databaseUrl }
  : {
      host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
      port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306', 10),
      user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
      password: process.env.DB_PASSWORD ?? process.env.MYSQLPASSWORD ?? '',
      database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'youngtech'
    };

const pool = mysql.createPool({
  ...databaseConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

async function ensureIndex(connection, table, indexName, columns) {
  const [rows] = await connection.query(
    `SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`,
    [indexName]
  );
  if (rows.length > 0) return;
  await connection.query(`CREATE INDEX \`${indexName}\` ON \`${table}\` (${columns})`);
  console.log(`Added index ${indexName} on ${table}.`);
}

export async function initDb() {
  const connection = await pool.getConnection();
  try {
    console.log('Initializing MySQL Tables...');

    // 1. users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        naver_id VARCHAR(255) UNIQUE,
        kakao_id VARCHAR(255) UNIQUE,
        google_id VARCHAR(255) UNIQUE,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        login_failed_count INT DEFAULT 0,
        locked_until DATETIME DEFAULT NULL,
        unlock_code_hash VARCHAR(255) DEFAULT NULL,
        unlock_code_expires_at DATETIME DEFAULT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure naver_id, phone, address columns exist in existing deployments
    try {
      await connection.query(`
        ALTER TABLE users ADD COLUMN naver_id VARCHAR(255) UNIQUE AFTER id
      `);
      console.log('Successfully checked/added naver_id column.');
    } catch (err) {}

    try {
      await connection.query(`
        ALTER TABLE users ADD COLUMN kakao_id VARCHAR(255) UNIQUE AFTER naver_id
      `);
      console.log('Successfully checked/added kakao_id column.');
    } catch (err) {}

    try {
      await connection.query(`
        ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE AFTER kakao_id
      `);
      console.log('Successfully checked/added google_id column.');
    } catch (err) {}

    try {
      await connection.query(`
        ALTER TABLE users ADD COLUMN phone VARCHAR(50) AFTER name
      `);
      console.log('Successfully checked/added phone column.');
    } catch (err) {}

    try {
      await connection.query(`
        ALTER TABLE users ADD COLUMN address TEXT AFTER phone
      `);
      console.log('Successfully checked/added address column.');
    } catch (err) {}

    try {
      await connection.query(`
        ALTER TABLE users ADD COLUMN login_failed_count INT DEFAULT 0 AFTER address
      `);
      console.log('Successfully checked/added login_failed_count column.');
    } catch (err) {}

    try {
      await connection.query(`
        ALTER TABLE users ADD COLUMN locked_until DATETIME DEFAULT NULL AFTER login_failed_count
      `);
      console.log('Successfully checked/added locked_until column.');
    } catch (err) {}

    try {
      await connection.query(`
        ALTER TABLE users ADD COLUMN unlock_code_hash VARCHAR(255) DEFAULT NULL AFTER locked_until
      `);
      console.log('Successfully checked/added unlock_code_hash column.');
    } catch (err) {}

    try {
      await connection.query(`
        ALTER TABLE users ADD COLUMN unlock_code_expires_at DATETIME DEFAULT NULL AFTER unlock_code_hash
      `);
      console.log('Successfully checked/added unlock_code_expires_at column.');
    } catch (err) {}

    try {
      const [targetRows] = await connection.query('SELECT id FROM users WHERE email = ?', ['drone1997@naver.com']);
      if (targetRows.length === 0) {
        await connection.query(
          `UPDATE users 
           SET email = ?, name = CASE WHEN name IN ('네이버테스트', '네이버사용자') THEN '' ELSE name END
           WHERE email = ? OR naver_id = ?`,
          ['drone1997@naver.com', 'naver_test_fixed_user@naver.com', 'naver_mock_fixed_user_id']
        );
      } else {
        const [mockRows] = await connection.query('SELECT id FROM users WHERE email = ? OR naver_id = ?', ['naver_test_fixed_user@naver.com', 'naver_mock_fixed_user_id']);
        for (const mockUser of mockRows) {
          await connection.query('UPDATE orders SET user_id = ? WHERE user_id = ?', [targetRows[0].id, mockUser.id]);
        }
      }
    } catch (err) {
      console.warn('Skipped Naver mock account cleanup:', err.message);
    }

    // Categories table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        parent_id VARCHAR(100) DEFAULT NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ensure sort_order exists in categories
    try {
      await connection.query(`ALTER TABLE categories ADD COLUMN sort_order INT DEFAULT 0`);
      console.log('Successfully checked/added sort_order column to categories.');
    } catch (err) {}

    try {
      await connection.query(`ALTER TABLE categories ADD COLUMN parent_id VARCHAR(100) DEFAULT NULL AFTER name`);
      console.log('Successfully checked/added parent_id column to categories.');
    } catch (err) {}

    const [categoryRows] = await connection.query('SELECT COUNT(*) as count FROM categories');
    if (categoryRows[0].count === 0) {
      console.log('Seeding default categories...');
      await connection.query(`
        INSERT INTO categories (id, name, sort_order) VALUES
        ('motor', '모터', 1),
        ('reducer', '감속기', 2),
        ('robot', '로봇', 3),
        ('plc', 'PLC', 4),
        ('motion', '볼스크류/LM', 5)
      `);
      console.log('Categories seeded.');
    }

    // 2. products table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        price INT NOT NULL,
        image TEXT,
        description TEXT,
        specs JSON,
        stock INT DEFAULT 50,
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMP NULL DEFAULT NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS motor_brands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ensure sort_order exists in products
    try {
      await connection.query(`ALTER TABLE products ADD COLUMN sort_order INT DEFAULT 0`);
      console.log('Successfully checked/added sort_order column to products.');
    } catch (err) {}

    try {
      await connection.query(`ALTER TABLE products ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at`);
      console.log('Successfully checked/added updated_at column to products.');
    } catch (err) {}

    try {
      await connection.query(`ALTER TABLE products ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE AFTER stock`);
      console.log('Successfully checked/added is_deleted column to products.');
    } catch (err) {}

    try {
      await connection.query(`ALTER TABLE products ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER is_deleted`);
      console.log('Successfully checked/added deleted_at column to products.');
    } catch (err) {}

    try {
      await connection.query(`ALTER TABLE products ADD COLUMN brand VARCHAR(50) NOT NULL DEFAULT '기타' AFTER category`);
      console.log('Successfully checked/added brand column to products.');
    } catch (err) {}

    try {
      await connection.query(`ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER is_deleted`);
      console.log('Successfully checked/added is_active column to products.');
    } catch (err) {}

    try {
      await connection.query(`
        UPDATE products
        SET brand = CASE
          WHEN LOWER(id) LIKE '%panasonic%' OR LOWER(name) LIKE '%panasonic%' THEN '파나소닉'
          WHEN LOWER(id) LIKE '%mitsubishi%' OR LOWER(name) LIKE '%mitsubishi%' THEN '미쓰비시'
          WHEN LOWER(id) LIKE '%fastech%' OR LOWER(name) LIKE '%fastech%' OR LOWER(name) LIKE '%ezi-servo%' THEN '파스텍'
          WHEN LOWER(id) LIKE '%inovance%' OR LOWER(name) LIKE '%inovance%' THEN '이노밴스'
          WHEN LOWER(id) LIKE '%nidec%' OR LOWER(name) LIKE '%nidec%' OR LOWER(id) LIKE '%shimpo%' OR LOWER(name) LIKE '%shimpo%' THEN '니덱'
          WHEN LOWER(id) LIKE '%moons%' OR LOWER(name) LIKE '%moons%' THEN '문스'
          WHEN LOWER(id) LIKE '%nikki%' OR LOWER(name) LIKE '%nikki%' THEN '닛키덴소'
          WHEN LOWER(id) LIKE '%rs-%' OR LOWER(name) LIKE '%rs automation%' THEN 'RS오토메이션'
          ELSE COALESCE(NULLIF(brand, ''), '기타')
        END
        WHERE category = 'motor'
      `);
    } catch (err) {
      console.warn('Skipped motor brand auto-mapping:', err.message);
    }

    // 3. orders table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        total_amount INT NOT NULL,
        order_items JSON NOT NULL,
        address TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. analytics table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS analytics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE UNIQUE NOT NULL,
        revenue INT DEFAULT 0,
        visitors INT DEFAULT 0
      )
    `);

    // 5. reviews table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id VARCHAR(100) NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        user_name VARCHAR(100) NOT NULL,
        rating INT NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. qna table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS qna (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id VARCHAR(100) NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        user_name VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        answer TEXT,
        is_secret BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Check and add carrier, tracking_number, confirmed_at columns to orders table if they don't exist
    const [columns] = await connection.query(`SHOW COLUMNS FROM orders`);
    const columnNames = columns.map(col => col.Field);
    
    if (!columnNames.includes('carrier')) {
      await connection.query(`ALTER TABLE orders ADD COLUMN carrier VARCHAR(50) DEFAULT 'logen' AFTER address`);
      console.log('Added carrier column to orders table.');
    }
    if (!columnNames.includes('tracking_number')) {
      await connection.query(`ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(100) DEFAULT NULL AFTER carrier`);
      console.log('Added tracking_number column to orders table.');
    }
    if (!columnNames.includes('confirmed_at')) {
      await connection.query(`ALTER TABLE orders ADD COLUMN confirmed_at TIMESTAMP DEFAULT NULL AFTER status`);
      console.log('Added confirmed_at column to orders table.');
    }
    if (!columnNames.includes('payment_method')) {
      await connection.query(`ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) DEFAULT 'mock_card' AFTER total_amount`);
      console.log('Added payment_method column to orders table.');
    }
    if (!columnNames.includes('payment_card_type')) {
      await connection.query(`ALTER TABLE orders ADD COLUMN payment_card_type VARCHAR(50) DEFAULT 'personal' AFTER payment_method`);
      console.log('Added payment_card_type column to orders table.');
    }
    if (!columnNames.includes('tax_document_type')) {
      await connection.query(`ALTER TABLE orders ADD COLUMN tax_document_type VARCHAR(50) DEFAULT 'card_receipt' AFTER payment_card_type`);
      console.log('Added tax_document_type column to orders table.');
    }
    if (!columnNames.includes('tax_document_status')) {
      await connection.query(`ALTER TABLE orders ADD COLUMN tax_document_status VARCHAR(50) DEFAULT 'issued_by_pg' AFTER tax_document_type`);
      console.log('Added tax_document_status column to orders table.');
    }
    if (!columnNames.includes('tax_invoice_required')) {
      await connection.query(`ALTER TABLE orders ADD COLUMN tax_invoice_required BOOLEAN DEFAULT FALSE AFTER tax_document_status`);
      console.log('Added tax_invoice_required column to orders table.');
    }
    if (!columnNames.includes('tax_note')) {
      await connection.query(`ALTER TABLE orders ADD COLUMN tax_note TEXT NULL AFTER tax_invoice_required`);
      console.log('Added tax_note column to orders table.');
    }

    // 7. claims table (Refund & Exchange)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS claims (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(100) NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        claim_type VARCHAR(50) NOT NULL, -- 'return' or 'exchange' or 'refund'
        reason TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'requested', -- 'requested', 'approved', 'rejected', 'completed'
        answer TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add columns to claims table for advanced refund logic
    const [claimColumns] = await connection.query(`SHOW COLUMNS FROM claims`);
    const claimColNames = claimColumns.map(col => col.Field);
    if (!claimColNames.includes('reason_type')) {
      await connection.query(`ALTER TABLE claims ADD COLUMN reason_type VARCHAR(50) DEFAULT 'buyer'`);
    }
    if (!claimColNames.includes('pickup_type')) {
      await connection.query(`ALTER TABLE claims ADD COLUMN pickup_type VARCHAR(50) DEFAULT 'pickup'`);
    }
    if (!claimColNames.includes('shipping_fee')) {
      await connection.query(`ALTER TABLE claims ADD COLUMN shipping_fee INT DEFAULT 0`);
    }
    if (!claimColNames.includes('refund_amount')) {
      await connection.query(`ALTER TABLE claims ADD COLUMN refund_amount INT DEFAULT 0`);
    }
    if (!claimColNames.includes('sweettracker_receipt_no')) {
      await connection.query(`ALTER TABLE claims ADD COLUMN sweettracker_receipt_no VARCHAR(100) DEFAULT NULL`);
    }
    if (!claimColNames.includes('product_id')) {
      await connection.query(`ALTER TABLE claims ADD COLUMN product_id VARCHAR(100) DEFAULT NULL`);
    }
    console.log('Claims table checked/created/updated.');

    // 8. Social login account-link verification and history
    await connection.query(`
      CREATE TABLE IF NOT EXISTS social_link_verifications (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        provider_user_id VARCHAR(255) NOT NULL,
        email VARCHAR(150) NOT NULL,
        code_hash VARCHAR(255) NOT NULL,
        failed_count INT DEFAULT 0,
        expires_at DATETIME NOT NULL,
        completed_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS social_link_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        provider VARCHAR(50) NOT NULL,
        provider_user_id VARCHAR(255) NOT NULL,
        method VARCHAR(50) NOT NULL,
        result VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Email verification before normal signup is finalized
    await connection.query(`
      CREATE TABLE IF NOT EXISTS signup_email_verifications (
        id VARCHAR(100) PRIMARY KEY,
        email VARCHAR(150) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        code_hash VARCHAR(255) NOT NULL,
        failed_count INT DEFAULT 0,
        expires_at DATETIME NOT NULL,
        completed_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 10. Password reset verification codes
    await connection.query(`
      CREATE TABLE IF NOT EXISTS password_reset_verifications (
        id VARCHAR(100) PRIMARY KEY,
        email VARCHAR(150) NOT NULL,
        code_hash VARCHAR(255) NOT NULL,
        failed_count INT DEFAULT 0,
        expires_at DATETIME NOT NULL,
        completed_at DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 11. SweetTracker quota protection tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS delivery_tracking_cache (
        cache_key VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        order_id VARCHAR(100),
        carrier VARCHAR(50) NOT NULL,
        tracking_number VARCHAR(100) NOT NULL,
        response_json JSON NOT NULL,
        expire_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS delivery_tracking_usage (
        month_key VARCHAR(7) PRIMARY KEY,
        used_count INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 11. Customer address book
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_addresses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        label VARCHAR(100) DEFAULT '배송지',
        recipient VARCHAR(100) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        postcode VARCHAR(10),
        base_address TEXT NOT NULL,
        detail_address TEXT,
        delivery_memo TEXT,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_addresses_user_default (user_id, is_default)
      )
    `);

    // Read-heavy admin/mypage/security indexes.
    await ensureIndex(connection, 'users', 'idx_users_role', '`role`');
    await ensureIndex(connection, 'users', 'idx_users_locked_until', '`locked_until`');
    await ensureIndex(connection, 'orders', 'idx_orders_user_created', '`user_id`, `created_at`');
    await ensureIndex(connection, 'orders', 'idx_orders_status_created', '`status`, `created_at`');
    await ensureIndex(connection, 'claims', 'idx_claims_order_id', '`order_id`');
    await ensureIndex(connection, 'claims', 'idx_claims_user_created', '`user_id`, `created_at`');
    await ensureIndex(connection, 'claims', 'idx_claims_status_created', '`status`, `created_at`');
    await ensureIndex(connection, 'categories', 'idx_categories_parent_sort', '`parent_id`, `sort_order`, `name`');
    await ensureIndex(connection, 'products', 'idx_products_category_sort', '`category`, `sort_order`');
    await ensureIndex(connection, 'products', 'idx_products_deleted_category_sort', '`is_deleted`, `category`, `sort_order`');
    await ensureIndex(connection, 'products', 'idx_products_category_brand_active', '`category`, `brand`, `is_active`, `is_deleted`');
    await ensureIndex(connection, 'motor_brands', 'idx_motor_brands_active_sort', '`is_active`, `sort_order`, `name`');
    await ensureIndex(connection, 'reviews', 'idx_reviews_product_created', '`product_id`, `created_at`');
    await ensureIndex(connection, 'qna', 'idx_qna_product_created', '`product_id`, `created_at`');
    await ensureIndex(connection, 'social_link_verifications', 'idx_social_link_verify_user', '`user_id`, `provider`, `created_at`');
    await ensureIndex(connection, 'social_link_verifications', 'idx_social_link_verify_expires', '`expires_at`');
    await ensureIndex(connection, 'social_link_history', 'idx_social_link_history_user', '`user_id`, `created_at`');
    await ensureIndex(connection, 'social_link_history', 'idx_social_link_history_provider', '`provider`, `created_at`');
    await ensureIndex(connection, 'signup_email_verifications', 'idx_signup_verify_email', '`email`, `created_at`');
    await ensureIndex(connection, 'signup_email_verifications', 'idx_signup_verify_expires', '`expires_at`');
    await ensureIndex(connection, 'password_reset_verifications', 'idx_password_reset_verify_email', '`email`, `created_at`');
    await ensureIndex(connection, 'password_reset_verifications', 'idx_password_reset_verify_expires', '`expires_at`');
    await ensureIndex(connection, 'delivery_tracking_cache', 'idx_delivery_cache_expire', '`expire_at`');
    await ensureIndex(connection, 'delivery_tracking_cache', 'idx_delivery_cache_user_order', '`user_id`, `order_id`');

    console.log('Tables Checked & Created successfully.');

    // Seed Default Users
    const [userRows] = await connection.query('SELECT COUNT(*) as count FROM users');
    if (userRows[0].count === 0) {
      console.log('Seeding default users...');
      const adminPasswordHash = bcrypt.hashSync('admin123', 10);
      const testPasswordHash = bcrypt.hashSync('password', 10);

      await connection.query(`
        INSERT INTO users (id, email, password, name, phone, role) VALUES
        ('admin', 'admin@youngtech.com', ?, '관리자', '01000000000', 'admin'),
        ('test', 'test@youngtech.com', ?, '테스트유저', '01012345678', 'user')
      `, [adminPasswordHash, testPasswordHash]);
      console.log('Users seeded.');
    }

    await connection.query(`
      UPDATE users
      SET phone = CASE
        WHEN id = 'admin' AND (phone IS NULL OR phone = '') THEN '01000000000'
        WHEN id = 'test' AND (phone IS NULL OR phone = '') THEN '01012345678'
        ELSE phone
      END
      WHERE id IN ('admin', 'test')
    `);

    // Seed Default Products
    const [productRows] = await connection.query('SELECT COUNT(*) as count FROM products');
    if (productRows[0].count === 0) {
      console.log('Seeding default products...');
      const initialProducts = [
        {
          id: 'inovance-md290',
          name: '이노밴스 범용 인버터 MD290',
          category: 'motor',
          price: 450000,
          image: 'https://globalyt.co.kr/data/file/table34/thumb-988007405_dxJw9qjU_4832414a8565cd70d1632029007334005361131c_174x124.png',
          description: '0.4~500kW 용량의 이노밴스(INOVANCE) 고성능 범용 인버터입니다. 우수한 제어 성능 and 강력한 과부하 내량을 제공합니다.',
          specs: JSON.stringify({
            '메이커': 'INOVANCE (이노밴스)',
            '용량 범위': '0.4 ~ 500 kW',
            '제어 방식': 'V/F 제어, 센서리스 벡터 제어',
            '보호 등급': 'IP20'
          }),
          stock: 45
        },
        {
          id: 'inovance-sv670',
          name: '이노밴스 SV670 서보드라이브',
          category: 'motor',
          price: 320000,
          image: 'https://globalyt.co.kr/data/file/table34/thumb-988007405_GJDmdzxh_05635de7b1f7ad1e67f4c198011dabc3e781d8b8_174x124.png',
          description: '유럽 기술력과 최적의 가성비를 자랑하는 이노밴스(INOVANCE)의 주력 서보드라이브입니다. 고속 응답 주파수와 간편한 디버깅을 지원합니다.',
          specs: JSON.stringify({
            '메이커': 'INOVANCE (이노밴스)',
            '통신 제어': 'EtherCAT, 펄스 열 제어',
            '정격 전압': '단상/삼상 AC 220V',
            '기타 기능': 'STOF 안전 기능 내장'
          }),
          stock: 30
        },
        {
          id: 'rs-csd7',
          name: '알에스 오토메이션 CSD 7 서보드라이버',
          category: 'motor',
          price: 380000,
          image: 'https://globalyt.co.kr/data/file/table34/thumb-32633931_K3QosPTZ_d71c96b6ad23cf86b29f6b1d5b5ab4446a0924a3_174x124.jpg',
          description: '대한민국 대표 국산 서보드라이버 CSD 7 시리즈입니다. 23bit 고분해능 엔코더 및 실시간 공진 억제 제어 알고리즘이 적용되었습니다.',
          specs: JSON.stringify({
            '메이커': 'RS Automation (알에스 오토메이션)',
            '분해능': '23-bit',
            '네트워크': 'EtherCAT, RTEX, Modbus',
            '제어 루프': '속도/위치/토크 루프 200μs'
          }),
          stock: 25
        },
        {
          id: 'panasonic-a6-yt',
          name: '파나소닉 MINAS A6 서보모터',
          category: 'motor',
          price: 480000,
          image: 'https://globalyt.co.kr/data/file/table34/thumb-32633931_qrE28jOd_d749361f0a1f2e318f5e3e976d4b9592d19d7374_174x124.gif',
          description: '분해능 향상, 앱솔루트 엔코더 기본 사용가능, 초경량화 실현 및 자동 튜닝 성능 강화로 최고 속도 제어가 가능한 PANASONIC 대표 서보모터입니다.',
          specs: JSON.stringify({
            '메이커': 'PANASONIC (파나소닉)',
            '분해능': '23-bit (8388608 pulse/rev)',
            '정격 속도': '3000 RPM',
            '보호 등급': 'IP67 기본 탑재'
          }),
          stock: 40
        },
        {
          id: 'nikki-dd-motor',
          name: '니키덴소 정밀 DD 모터 (ND-c / 박형)',
          category: 'motor',
          price: 1850000,
          image: 'https://globalyt.co.kr/data/file/table34/thumb-3745434262_eson0ErF_a001145a47569e78bc4dd1d0ac14b9c56a17e379_174x124.jpg',
          description: '최고 성능의 정밀 다이렉트 드라이브(DD) 모터입니다. 기어리스 직결 구동으로 백래시가 전혀 없으며 저소음과 초정밀 위치결정을 보장합니다.',
          specs: JSON.stringify({
            '메이커': 'Nikki Denso (니키덴소)',
            '최대 토크': '12 N·m ~ 120 N·m',
            '구조': '박형 및 고토크 지향 구조',
            '정격 출력': '고정밀 분해능 엔코더 지원'
          }),
          stock: 12
        },
        {
          id: 'nidec-kh-step',
          name: '니덱재팬서보 KH 시리즈 스텝모터',
          category: 'motor',
          price: 65000,
          image: 'https://globalyt.co.kr/data/file/table34/thumb-2943748487_QzxDVIHW_5bf0f8c4581726b09159b477d10c922fc5ae5704_174x124.jpg',
          description: '소형화, 경량화 및 고출력을 실현한 니덱재팬서보의 고성능 2상 스텝모터입니다. 저진동 및 우수한 저속 구간 회전 안정성을 가집니다.',
          specs: JSON.stringify({
            '메이커': 'NIDEC Japan Servo (니덱재팬서보)',
            '기본 구조': 'KH 시리즈 하이브리드 타입',
            '스텝 각도': '1.8 도',
            '특징': '고효율 마그네틱 회로 설계'
          }),
          stock: 80
        },
        {
          id: 'fastech-ezi-servo',
          name: '파스텍 Ezi-Servo 클로즈루프 스텝모터',
          category: 'motor',
          price: 240000,
          image: 'https://images.unsplash.com/photo-1504607798333-52a30db54a5d?auto=format&fit=crop&q=80&w=600',
          description: '국산 폐루프 제어 스텝모터 Ezi-Servo입니다. 스텝모터의 고탈조 한계를 완벽히 극복하고 실시간 위치 보정을 통해 서보에 준하는 성능을 냅니다.',
          specs: JSON.stringify({
            '메이커': 'FASTECH (파스텍 / 이지서보)',
            '네트워크': 'EtherCAT, CC-Link, 펄스입력',
            '제어 방식': 'Closed-Loop 제어',
            '기타': '엔코더 일체형 고정밀 튜닝'
          }),
          stock: 35
        },
        {
          id: 'moons-stm-yt',
          name: '문스 하이브리드 스텝모터 (SSM/STM)',
          category: 'motor',
          price: 145000,
          image: 'https://globalyt.co.kr/data/file/table34/thumb-2943748487_mgQZE7q1_35857a4daada1a9b9d74839ced8af2fb8112a2e8_174x124.jpg',
          description: '세계 3대 스텝모터 제조사인 MOONS의 고신뢰성 스텝모터 시리즈입니다. 정교한 코일 설계로 발열 및 진동을 최소화했습니다.',
          specs: JSON.stringify({
            '메이커': 'MOONS (문스)',
            '동작 타입': '2상/4상 하이브리드',
            '기타': '발열 제어 및 전용 드라이브 패키지 대응'
          }),
          stock: 50
        },
        {
          id: 'mitsubishi-j4-yt',
          name: '미쓰비시 MELSERVO-J4 서보모터',
          category: 'motor',
          price: 520000,
          image: 'https://globalyt.co.kr/data/file/table34/thumb-2943748487_T1GDkoXj_6fb16b050be9a98b133b3b3253e284d6d278eaf1_174x124.jpg',
          description: '미쓰비시의 특허받은 공진 억제 및 고속 진동 억제 튜닝 필터가 탑재된 MR-J4 시리즈 하이엔드 서보모터입니다.',
          specs: JSON.stringify({
            '메이커': 'MITSUBISHI (미쓰비시)',
            '분해능': '22-bit (4194304 pulse/rev)',
            '네트워크': 'SSCNET III/H'
          }),
          stock: 18
        },
        {
          id: 'panasonic-a5-yt',
          name: '파나소닉 MINAS A5 서보모터',
          category: 'motor',
          price: 390000,
          image: 'https://globalyt.co.kr/data/file/table34/thumb-2943748487_VplFJkHS_c8b0ec9587e05c0c7a5328ebd3d34e2441463107_174x124.jpg',
          description: '빠르고, 똑똑하며, 컴팩트한 파나소닉의 전 세대 베스트셀러 MINAS A5 시리즈 서보모터입니다. 실무 현장 설치 호환성이 매우 우수합니다.',
          specs: JSON.stringify({
            '메이커': 'PANASONIC (파나소닉)',
            '정격 속도': '3000 RPM',
            '입력 전압': '단상 AC 220V'
          }),
          stock: 22
        },
        {
          id: 'shimpo-vrsf',
          name: '심포(SHIMPO) 정밀 감속기 VRSF 시리즈 (VRSF-85D)',
          category: 'reducer',
          price: 240000,
          image: 'https://images.unsplash.com/photo-1537462715879-360eeb61a0bc?auto=format&fit=crop&q=80&w=600',
          description: '백래시가 매우 적어 정밀 고속 위치 결정 서보 기구에 널리 사용되는 심포(SHIMPO)의 고정밀 유성기어 감속기입니다.',
          specs: JSON.stringify({
            '메이커': 'NIDEC SHIMPO (심포)',
            '감속비': '1/5, 1/10, 1/15 선택 가능',
            '백래시': '3 arcmin 이하',
            '정격 출력 토크': '45 N·m',
            '취부 치수': '85 mm 플랜지 대응',
            '효율': '95% 이상'
          }),
          stock: 15
        },
        {
          id: 'atro-robot',
          name: '아트로 로봇 AR 시리즈 직교 로봇 (AR-S120)',
          category: 'robot',
          price: 1800000,
          image: 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&q=80&w=600',
          description: '강력한 볼스크류와 리니어 가이드를 일체형 알루미늄 프로파일로 최적 설계하여 고하중, 고정밀 반복 구동을 보장하는 아트로(ATRO) 직교 로봇 모듈입니다.',
          specs: JSON.stringify({
            '메이커': 'ATRO ROBOT (아트로)',
            '최대 스트로크': '1200 mm',
            '반복 정밀도': '±0.02 mm',
            '최대 가속 속도': '1000 mm/s',
            '가변 하중': '수평 30 kg / 수직 12 kg',
            '적용 모터': '100W/200W 서보모터 대응'
          }),
          stock: 8
        },
        {
          id: 'panasonic-fp7',
          name: '파나소닉 고속 네트워크형 PLC CPU (FP7-CPS11)',
          category: 'plc',
          price: 680000,
          image: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&q=80&w=600',
          description: '고속 연산 처리 및 대용량 메모리를 장착하여 복잡한 다축 서보 모션 동기 제어를 유연하게 실현하는 파나소닉 최신 FP7 시리즈 컴팩트 CPU입니다.',
          specs: JSON.stringify({
            '메이커': 'PANASONIC (파나소닉)',
            '연산 속도': '11 ns / 기본 명령',
            '프로그램 용량': '120k Steps',
            '통신포트': 'Ethernet 내장 (MEWTOCOL / Modbus)',
            '다축 모션 제어': '최대 64축 동기 구동 지원',
            '동작 전압': 'DC 24 V'
          }),
          stock: 14
        },
        {
          id: 'thk-lm-hsr25',
          name: 'THK 정밀 리니어 가이드 HSR25 시리즈 (HSR25-A)',
          category: 'motion',
          price: 120000,
          image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=600',
          description: '4방향 등하중 형으로 설계되어 상하좌우 모든 방향의 정하중에 균등하게 대응하며 고강성, 저소음 구동이 우수한 THK 오리지널 정밀 리니어 가이드입니다.',
          specs: JSON.stringify({
            '메이커': 'THK (티에이치케이)',
            '블록 형식': '플랜지형 (HSR25A)',
            '레일 너비': '23 mm',
            '기본 동정격 하중': '27.6 kN',
            '기본 정정격 하중': '36.4 kN',
            '정밀 등급': '정밀급 (P 등급)'
          }),
          stock: 60
        }
      ];

      for (const p of initialProducts) {
        await connection.query(`
          INSERT INTO products (id, name, category, price, image, description, specs, stock)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [p.id, p.name, p.category, p.price, p.image, p.description, p.specs, p.stock]);
      }
      console.log('Products seeded.');
    }

    const [motorBrandRows] = await connection.query('SELECT COUNT(*) as count FROM motor_brands');
    if (motorBrandRows[0].count === 0) {
      const [brandRows] = await connection.query(`
        SELECT DISTINCT brand
        FROM products
        WHERE category = 'motor'
          AND is_deleted = FALSE
          AND brand IS NOT NULL
          AND brand <> ''
        ORDER BY brand ASC
      `);

      if (brandRows.length > 0) {
        const values = brandRows.map((row, index) => [row.brand, index + 1]);
        await connection.query(
          'INSERT INTO motor_brands (name, sort_order) VALUES ?',
          [values]
        );
        console.log('Motor brands seeded from products.');
      }
    }

    // Seed 30 Days Analytics Dummy Data
    const [analyticsRows] = await connection.query('SELECT COUNT(*) as count FROM analytics');
    if (analyticsRows[0].count === 0) {
      console.log('Seeding 30 days analytics...');
      const today = new Date();
      for (let i = 30; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateString = d.toISOString().split('T')[0];

        // Random visitors between 100 ~ 500
        const visitors = Math.floor(Math.random() * 400) + 100;
        // Random revenue between 500,000 ~ 5,000,000
        const revenue = Math.floor(Math.random() * 4500000) + 500000;

        await connection.query(`
          INSERT INTO analytics (date, revenue, visitors) VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE revenue=VALUES(revenue), visitors=VALUES(visitors)
        `, [dateString, revenue, visitors]);
      }
      console.log('Analytics seeded.');
    }

  } catch (error) {
    console.error('Database Initialization Failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export default pool;
