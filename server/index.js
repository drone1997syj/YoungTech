import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import pool, { initDb } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'youngtech_super_secret_jwt_key_2026';
const LOGIN_LOCK_MINUTES = 30;
const UNLOCK_CODE_MINUTES = 15;
const loginIpBuckets = new Map();

app.use(cors());
app.use(express.json());

// Normalize www -> apex so one domain is enough to connect and share.
app.use((req, res, next) => {
  const host = (req.get('host') || '').split(',')[0].trim();
  if (host.startsWith('www.')) {
    const apexHost = host.replace(/^www\./, '');
    const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
    return res.redirect(301, `${proto}://${apexHost}${req.originalUrl}`);
  }
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'prod-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('이미지 파일만 업로드 가능합니다.'));
  }
});

const getPublicBaseUrl = (req) => {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
  const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();

  if (host) {
    return `${proto}://${host}`;
  }

  return 'http://localhost:5000';
};

const isMailConfigured = () => Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

const sendMail = async ({ to, subject, text }) => {
  if (!isMailConfigured()) {
    console.log(`[Mail:dev] ${subject} -> ${to}\n${text}`);
    return { sent: false, devMode: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text
  });

  return { sent: true, devMode: false };
};

const getClientIp = (req) => (
  req.headers['x-forwarded-for']?.split(',')[0]?.trim()
  || req.socket?.remoteAddress
  || req.ip
  || 'unknown'
);

const isLoginIpLimited = (req) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxAttemptsPerMinute = 30;
  const attempts = (loginIpBuckets.get(ip) || []).filter(timestamp => now - timestamp < windowMs);
  attempts.push(now);
  loginIpBuckets.set(ip, attempts);
  return attempts.length > maxAttemptsPerMinute;
};

const getLoginLimitForRole = (role) => (role === 'admin' ? 5 : 7);

const createUnlockCode = () => String(Math.floor(100000 + Math.random() * 900000));

const buildLockMessage = (limit) => (
  `로그인 실패가 ${limit}회 이상 발생해 계정 보호를 위해 로그인이 제한되었습니다. 가입된 이메일 인증 후 다시 이용해 주세요.`
);

const validatePasswordPolicy = (password, context = {}) => {
  const value = String(password || '');
  if (value.length < 8 || value.length > 64) {
    return '비밀번호는 8자 이상 64자 이하로 입력해 주세요.';
  }
  if (/\s/.test(value)) {
    return '비밀번호에는 공백을 사용할 수 없습니다.';
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value) || !/[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?`~]/.test(value)) {
    return '비밀번호는 영문, 숫자, 특수문자를 모두 포함해야 합니다.';
  }
  const lowered = value.toLowerCase();
  const emailId = String(context.email || '').split('@')[0]?.toLowerCase();
  const name = String(context.name || '').toLowerCase();
  if (emailId && emailId.length >= 4 && lowered.includes(emailId)) {
    return '비밀번호에 이메일 아이디와 같은 문자열을 포함할 수 없습니다.';
  }
  if (name && name.length >= 2 && lowered.includes(name)) {
    return '비밀번호에 이름과 같은 문자열을 포함할 수 없습니다.';
  }
  return null;
};

const createLockUntilDate = () => new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000);

const createUnlockExpireDate = () => new Date(Date.now() + UNLOCK_CODE_MINUTES * 60 * 1000);

const deriveOrderStatusFromItems = (items, fallbackStatus = 'pending') => {
  const statuses = (items || []).map(item => item.status || fallbackStatus).filter(Boolean);
  if (statuses.length === 0) return fallbackStatus;
  if (statuses.every(status => status === statuses[0])) return statuses[0];

  const activeRequestStatus = ['cancel_requested', 'returning', 'exchanging', 'refunding']
    .find(status => statuses.includes(status));
  if (activeRequestStatus) {
    return activeRequestStatus === 'cancel_requested'
      ? 'cancel_requested'
      : `part_${activeRequestStatus}`;
  }

  const completedStatus = ['cancelled', 'returned', 'exchanged', 'refunded', 'confirmed']
    .find(status => statuses.includes(status));
  if (completedStatus) return `part_${completedStatus}`;

  if (statuses.includes('shipping')) return 'shipping';
  if (statuses.includes('delivered')) return 'delivered';
  if (statuses.includes('preparing')) return 'preparing';
  if (statuses.includes('pending')) return 'pending';

  return fallbackStatus;
};

// ==========================================
// JWT Middleware
// ==========================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: '인증 토큰이 누락되었습니다.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: '유효하지 않거나 만료된 토큰입니다.' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    next();
  });
}

// ==========================================
// Authentication APIs
// ==========================================
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, phone } = req.body;
  const normalizedPhone = String(phone || '').replace(/\D/g, '');

  if (!email || !password || !name || !normalizedPhone) {
    return res.status(400).json({ message: '이메일, 비밀번호, 이름, 휴대폰 번호를 모두 입력해주세요.' });
  }

  if (!/^01\d{8,9}$/.test(normalizedPhone)) {
    return res.status(400).json({ message: '휴대폰 번호를 올바르게 입력해주세요.' });
  }

  const passwordError = validatePasswordPolicy(password, { email, name });
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  try {
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: '이미 가입된 이메일 주소입니다.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const userId = 'user_' + Date.now();

    await pool.query(
      'INSERT INTO users (id, email, password, name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, email, hashedPassword, name, normalizedPhone, 'user']
    );

    res.status(201).json({ message: '회원가입이 완료되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
  }

  if (isLoginIpLimited(req)) {
    return res.status(429).json({
      message: '짧은 시간 동안 로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
      isRateLimited: true
    });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(400).json({ message: '가입되지 않은 이메일이거나 비밀번호가 다릅니다.' });
    }

    const user = rows[0];
    const limit = getLoginLimitForRole(user.role);
    const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;

    if (lockedUntil && lockedUntil > new Date()) {
      return res.status(423).json({
        message: buildLockMessage(limit),
        needsEmailUnlock: true,
        maskedEmail: maskEmailForRecovery(user.email),
        lockedUntil: lockedUntil.toISOString(),
        remainingMinutes: Math.ceil((lockedUntil.getTime() - Date.now()) / 60000)
      });
    }

    if (lockedUntil && lockedUntil <= new Date()) {
      await pool.query(
        'UPDATE users SET login_failed_count = 0, locked_until = NULL, unlock_code_hash = NULL, unlock_code_expires_at = NULL WHERE id = ?',
        [user.id]
      );
      user.login_failed_count = 0;
    }

    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
      const failedCount = Number(user.login_failed_count || 0) + 1;

      if (failedCount >= limit) {
        const unlockCode = createUnlockCode();
        const unlockCodeHash = bcrypt.hashSync(unlockCode, 10);
        const lockedUntilDate = createLockUntilDate();
        const unlockExpiresAt = createUnlockExpireDate();

        await pool.query(
          `UPDATE users
           SET login_failed_count = ?, locked_until = ?, unlock_code_hash = ?, unlock_code_expires_at = ?
           WHERE id = ?`,
          [failedCount, lockedUntilDate, unlockCodeHash, unlockExpiresAt, user.id]
        );

        const mailResult = await sendMail({
          to: user.email,
          subject: '[YoungTech] 로그인 제한 해제 인증번호',
          text: `YoungTech 로그인 제한 해제 인증번호는 ${unlockCode} 입니다.\n\n인증번호는 ${UNLOCK_CODE_MINUTES}분 동안만 사용할 수 있습니다.\n본인이 로그인한 것이 아니라면 비밀번호를 변경하고 고객센터로 문의해 주세요.`
        });

        return res.status(423).json({
          message: buildLockMessage(limit),
          needsEmailUnlock: true,
          maskedEmail: maskEmailForRecovery(user.email),
          lockedUntil: lockedUntilDate.toISOString(),
          remainingMinutes: LOGIN_LOCK_MINUTES,
          devUnlockCode: mailResult.devMode ? unlockCode : undefined
        });
      }

      await pool.query('UPDATE users SET login_failed_count = ? WHERE id = ?', [failedCount, user.id]);

      const remaining = limit - failedCount;
      return res.status(400).json({
        message: failedCount >= 4
          ? `이메일 또는 비밀번호가 일치하지 않습니다. 보안을 위해 ${remaining}회 추가 실패 시 계정이 잠깁니다.`
          : '가입되지 않은 이메일이거나 비밀번호가 다릅니다.',
        failedCount,
        remainingAttempts: remaining,
        showSecurityWarning: failedCount >= 4
      });
    }

    await pool.query(
      'UPDATE users SET login_failed_count = 0, locked_until = NULL, unlock_code_hash = NULL, unlock_code_expires_at = NULL WHERE id = ?',
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

app.post('/api/auth/unlock-login', async (req, res) => {
  const { email, code } = req.body;
  const normalizedCode = String(code || '').replace(/\D/g, '');

  if (!email || !normalizedCode) {
    return res.status(400).json({ message: '이메일과 인증번호를 입력해 주세요.' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ message: '입력하신 정보와 일치하는 계정을 찾을 수 없습니다.' });
    }

    const user = rows[0];
    if (!user.unlock_code_hash || !user.unlock_code_expires_at) {
      return res.status(400).json({ message: '발급된 이메일 인증번호가 없습니다. 로그인 시도를 다시 진행해 주세요.' });
    }

    const expiresAt = new Date(user.unlock_code_expires_at);
    if (expiresAt <= new Date()) {
      return res.status(400).json({ message: '인증번호가 만료되었습니다. 로그인 시도를 다시 진행해 주세요.' });
    }

    const isValidCode = bcrypt.compareSync(normalizedCode, user.unlock_code_hash);
    if (!isValidCode) {
      return res.status(400).json({ message: '인증번호가 일치하지 않습니다.' });
    }

    await pool.query(
      'UPDATE users SET login_failed_count = 0, locked_until = NULL, unlock_code_hash = NULL, unlock_code_expires_at = NULL WHERE id = ?',
      [user.id]
    );

    return res.json({
      success: true,
      message: '이메일 인증이 완료되었습니다. 다시 로그인해 주세요.'
    });
  } catch (error) {
    console.error('Unlock Login Error:', error);
    res.status(500).json({ message: '로그인 잠금 해제 중 오류가 발생했습니다.' });
  }
});

const maskEmailForRecovery = (email = '') => {
  const parts = String(email).split('@');
  if (parts.length !== 2) return email;

  const [id, domain] = parts;
  const [domainName, ...domainRest] = domain.split('.');
  const maskedId = id.length > 2
    ? id.substring(0, 2) + '*'.repeat(id.length - 2)
    : `${id[0] || '*'}*`;
  const maskedDomain = domainName
    ? `${domainName[0]}${'*'.repeat(Math.max(2, domainName.length - 1))}`
    : '***';
  return `${maskedId}@${maskedDomain}${domainRest.length ? `.${domainRest.join('.')}` : ''}`;
};

// ID 찾기 API
app.post('/api/auth/find-id', async (req, res) => {
  const { name, phone } = req.body;
  const normalizedPhone = String(phone || '').replace(/\D/g, '');

  if (!name || name.trim() === '' || !normalizedPhone) {
    return res.status(400).json({ message: '이름과 휴대폰 번호를 모두 입력해 주세요.' });
  }

  if (!/^01\d{8,9}$/.test(normalizedPhone)) {
    return res.status(400).json({ message: '휴대폰 번호를 올바르게 입력해 주세요.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT email FROM users WHERE name = ? AND REPLACE(REPLACE(REPLACE(phone, "-", ""), " ", ""), ".", "") = ?',
      [name.trim(), normalizedPhone]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: '입력하신 정보와 일치하는 가입 정보가 없습니다.' });
    }

    // 보안을 위해 이메일 마스킹 처리
    const maskedEmails = rows.map(row => maskEmailForRecovery(row.email));
    await Promise.all(rows.map(row => sendMail({
      to: row.email,
      subject: '[YoungTech] 아이디 찾기 안내',
      text: `YoungTech 아이디 찾기 요청이 접수되었습니다.\n\n확인된 가입 이메일: ${maskEmailForRecovery(row.email)}\n\n보안을 위해 전체 이메일 주소는 화면에 표시하지 않습니다. 본인이 요청하지 않았다면 이 메일을 무시해 주세요.`
    })));

    res.json({
      success: true,
      emails: maskedEmails,
      message: '전체 이메일 주소는 가입된 이메일로 안내되었습니다.'
    });
  } catch (error) {
    console.error('Find ID Error:', error);
    res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
  }
});

// 비밀번호 찾기(임시 비밀번호 생성) API
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) {
    return res.status(400).json({ message: '이메일과 이름을 모두 입력해 주세요.' });
  }

  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ? AND name = ?', [email.trim(), name.trim()]);
    if (rows.length === 0) {
      return res.status(404).json({ message: '입력하신 정보와 일치하는 가입 정보가 없습니다.' });
    }

    const userId = rows[0].id;
    // 8자리 임시 비밀번호 난수 생성
    const tempPassword = createTemporaryPassword();
    const hashedTempPassword = bcrypt.hashSync(tempPassword, 10);

    // 비밀번호 업데이트
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedTempPassword, userId]);
    const mailResult = await sendMail({
      to: email.trim(),
      subject: '[YoungTech] 임시 비밀번호 안내',
      text: `YoungTech 임시 비밀번호는 ${tempPassword} 입니다.\n\n로그인 후 반드시 마이페이지에서 새 비밀번호로 변경해 주세요.\n본인이 요청하지 않았다면 고객센터로 문의해 주세요.`
    });

    // 모의 메일 전송 메시지 및 로컬 테스트용 복구값 제공
    res.json({ 
      success: true, 
      message: `${email} 주소로 임시 비밀번호가 발송되는 시뮬레이션이 활성화되었습니다.`, 
      tempPassword: mailResult.devMode ? tempPassword : undefined
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, email, name, role, created_at, phone, address FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

// ==========================================
// Social Login APIs
// ==========================================
const SOCIAL_PROVIDER_CONFIG = {
  naver: { idColumn: 'naver_id', label: '네이버' },
  kakao: { idColumn: 'kakao_id', label: '카카오' },
  google: { idColumn: 'google_id', label: '구글' }
};

const createLoginToken = (user) => jwt.sign(
  { id: user.id, email: user.email, name: user.name, role: user.role },
  JWT_SECRET,
  { expiresIn: '7d' }
);

const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role
});

const getDisplayNameFromProfile = (name, email) => {
  const trimmedName = String(name || '').trim();
  if (trimmedName) return trimmedName;
  const emailPrefix = String(email || '').split('@')[0]?.trim();
  return emailPrefix || '고객';
};

const createSocialLinkToken = ({ provider, providerUserId, email }) => jwt.sign(
  { type: 'social_link', provider, providerUserId, email },
  JWT_SECRET,
  { expiresIn: '10m' }
);

const createSocialLinkCode = () => String(Math.floor(100000 + Math.random() * 900000));

const createTemporaryPassword = () => {
  const base = crypto.randomBytes(6).toString('base64url').replace(/[^A-Za-z0-9]/g, '');
  return `${base.slice(0, 10)}Aa!1`;
};

const createSocialLinkVerification = async ({ provider, providerUserId, user }) => {
  const code = createSocialLinkCode();
  const linkId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO social_link_verifications 
     (id, user_id, provider, provider_user_id, email, code_hash, failed_count, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
    [linkId, user.id, provider, providerUserId, user.email, bcrypt.hashSync(code, 10)]
  );
  const mailResult = await sendMail({
    to: user.email,
    subject: '[YoungTech] 간편로그인 연결 인증번호',
    text: `YoungTech 간편로그인 연결 인증번호는 ${code} 입니다.\n\n인증번호는 10분 동안만 사용할 수 있으며, 5회 이상 틀리면 재발급이 필요합니다.\n본인이 요청하지 않았다면 이 메일을 무시하고 고객센터로 문의해 주세요.`
  });

  return { linkId, code, mailResult };
};

const sendSocialLinkRequired = async (res, { provider, providerUserId, user, emailVerified = false }) => {
  const config = SOCIAL_PROVIDER_CONFIG[provider];
  const hasProviderConflict = Boolean(user[config.idColumn] && user[config.idColumn] !== providerUserId);
  const requiresPassword = user.role === 'admin' || !emailVerified;

  if (requiresPassword) {
    return res.json({
      success: false,
      requiresAccountLink: true,
      linkMethod: 'password',
      provider,
      providerLabel: config.label,
      email: user.email,
      maskedEmail: maskEmailForRecovery(user.email),
      linkToken: createSocialLinkToken({ provider, providerUserId, email: user.email }),
      message: user.role === 'admin'
        ? '관리자 계정은 보안을 위해 기존 영테크 비밀번호 확인 후에만 간편로그인을 연결할 수 있습니다.'
        : '간편로그인 이메일 검증 상태를 확인할 수 없어 기존 영테크 비밀번호 확인이 필요합니다.'
    });
  }

  if (!hasProviderConflict) {
    return res.json({
      success: false,
      requiresAccountLink: true,
      linkMethod: 'confirm',
      provider,
      providerLabel: config.label,
      email: user.email,
      maskedEmail: maskEmailForRecovery(user.email),
      linkToken: createSocialLinkToken({ provider, providerUserId, email: user.email }),
      message: `이미 영테크에 가입된 이메일입니다. 같은 이메일의 ${config.label} 계정을 기존 영테크 계정에 연결하면 앞으로 간편로그인도 사용할 수 있습니다.`
    });
  }

  const { linkId, code, mailResult } = await createSocialLinkVerification({ provider, providerUserId, user });
  return res.json({
    success: false,
    requiresAccountLink: true,
    linkMethod: 'email',
    provider,
    providerLabel: config.label,
    email: user.email,
    maskedEmail: maskEmailForRecovery(user.email),
    linkId,
    devVerificationCode: mailResult?.devMode ? code : undefined,
    message: '이미 영테크에 가입된 이메일입니다. 가입된 이메일로 발송된 인증번호를 입력하면 간편로그인을 연결할 수 있습니다.'
  });
};

const completeSocialLogin = (res, user, extras = {}) => {
  const token = createLoginToken(user);
  return res.json({
    success: true,
    token,
    user: sanitizeUser(user),
    needsAdditionalInfo: false,
    ...extras
  });
};

app.post('/api/auth/link-social', async (req, res) => {
  const { linkToken, password } = req.body;
  if (!linkToken || !password) {
    return res.status(400).json({ message: '계정 연결 정보와 비밀번호를 입력해 주세요.' });
  }

  try {
    const payload = jwt.verify(linkToken, JWT_SECRET);
    if (payload.type !== 'social_link') {
      return res.status(400).json({ message: '유효하지 않은 계정 연결 요청입니다.' });
    }

    const config = SOCIAL_PROVIDER_CONFIG[payload.provider];
    if (!config) {
      return res.status(400).json({ message: '지원하지 않는 간편로그인 제공자입니다.' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [payload.email]);
    if (rows.length === 0) {
      return res.status(404).json({ message: '연결할 영테크 계정을 찾을 수 없습니다.' });
    }

    const user = rows[0];
    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: '영테크 비밀번호가 일치하지 않습니다.' });
    }

    await pool.query(`UPDATE users SET ${config.idColumn} = ? WHERE id = ?`, [payload.providerUserId, user.id]);
    await pool.query(
      'INSERT INTO social_link_history (user_id, provider, provider_user_id, method, result) VALUES (?, ?, ?, ?, ?)',
      [user.id, payload.provider, payload.providerUserId, 'password', 'linked']
    );
    const [updatedRows] = await pool.query('SELECT * FROM users WHERE id = ?', [user.id]);
    await sendMail({
      to: updatedRows[0].email,
      subject: '[YoungTech] 간편로그인 연결 완료 안내',
      text: `${config.label} 간편로그인이 YoungTech 계정에 연결되었습니다.\n\n본인이 연결한 것이 아니라면 즉시 비밀번호를 변경하고 고객센터로 문의해 주세요.`
    });

    return completeSocialLogin(res, updatedRows[0], {
      linked: true,
      message: `${config.label} 간편로그인이 기존 영테크 계정에 연결되었습니다. 연결 완료 알림이 기존 이메일로 발송되었습니다.`
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '계정 연결 요청 시간이 만료되었습니다. 간편로그인을 다시 시도해 주세요.' });
    }
    console.error('Social Link Error:', error);
    return res.status(500).json({ message: '계정 연결 처리 중 오류가 발생했습니다.' });
  }
});

app.post('/api/auth/link-social-confirm', async (req, res) => {
  const { linkToken } = req.body;
  if (!linkToken) {
    return res.status(400).json({ message: '계정 연결 정보가 없습니다. 간편로그인을 다시 시도해 주세요.' });
  }

  try {
    const payload = jwt.verify(linkToken, JWT_SECRET);
    if (payload.type !== 'social_link') {
      return res.status(400).json({ message: '유효하지 않은 계정 연결 요청입니다.' });
    }

    const config = SOCIAL_PROVIDER_CONFIG[payload.provider];
    if (!config) {
      return res.status(400).json({ message: '지원하지 않는 간편로그인 제공자입니다.' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [payload.email]);
    if (rows.length === 0) {
      return res.status(404).json({ message: '연결할 영테크 계정을 찾을 수 없습니다.' });
    }

    const user = rows[0];
    if (user.role === 'admin') {
      return res.status(403).json({ message: '관리자 계정은 확인만으로 간편로그인을 연결할 수 없습니다. 비밀번호 확인이 필요합니다.' });
    }

    if (user[config.idColumn] && user[config.idColumn] !== payload.providerUserId) {
      return res.status(409).json({ message: `이미 다른 ${config.label} 계정이 연결되어 있습니다. 이메일 인증을 다시 진행해 주세요.` });
    }

    await pool.query(`UPDATE users SET ${config.idColumn} = ? WHERE id = ?`, [payload.providerUserId, user.id]);
    await pool.query(
      'INSERT INTO social_link_history (user_id, provider, provider_user_id, method, result) VALUES (?, ?, ?, ?, ?)',
      [user.id, payload.provider, payload.providerUserId, 'confirm', 'linked']
    );

    const [updatedRows] = await pool.query('SELECT * FROM users WHERE id = ?', [user.id]);
    await sendMail({
      to: updatedRows[0].email,
      subject: '[YoungTech] 간편로그인 연결 완료 안내',
      text: `${config.label} 간편로그인이 YoungTech 계정에 연결되었습니다.\n\n본인이 연결한 것이 아니라면 즉시 비밀번호를 변경하고 고객센터로 문의해 주세요.`
    });

    return completeSocialLogin(res, updatedRows[0], {
      linked: true,
      message: `${config.label} 간편로그인이 기존 영테크 계정에 연결되었습니다.`
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '계정 연결 요청 시간이 만료되었습니다. 간편로그인을 다시 시도해 주세요.' });
    }
    console.error('Social Confirm Link Error:', error);
    return res.status(500).json({ message: '계정 연결 처리 중 오류가 발생했습니다.' });
  }
});

app.post('/api/auth/link-social-email', async (req, res) => {
  const { linkId, code } = req.body;
  const normalizedCode = String(code || '').replace(/\D/g, '');

  if (!linkId || !normalizedCode) {
    return res.status(400).json({ message: '계정 연결 인증번호를 입력해 주세요.' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM social_link_verifications WHERE id = ?', [linkId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: '계정 연결 요청을 찾을 수 없습니다. 간편로그인을 다시 시도해 주세요.' });
    }

    const verification = rows[0];
    const config = SOCIAL_PROVIDER_CONFIG[verification.provider];
    if (!config) {
      return res.status(400).json({ message: '지원하지 않는 간편로그인 제공자입니다.' });
    }

    if (verification.completed_at) {
      return res.status(400).json({ message: '이미 처리된 계정 연결 요청입니다.' });
    }

    if (new Date(verification.expires_at) <= new Date()) {
      return res.status(400).json({ message: '인증번호 유효시간이 만료되었습니다. 간편로그인을 다시 시도해 주세요.' });
    }

    if (Number(verification.failed_count || 0) >= 5) {
      return res.status(429).json({ message: '인증번호 입력 실패가 5회를 초과했습니다. 인증번호를 재발급해 주세요.' });
    }

    const isValidCode = bcrypt.compareSync(normalizedCode, verification.code_hash);
    if (!isValidCode) {
      const nextCount = Number(verification.failed_count || 0) + 1;
      await pool.query('UPDATE social_link_verifications SET failed_count = ? WHERE id = ?', [nextCount, linkId]);
      return res.status(400).json({
        message: nextCount >= 5
          ? '인증번호 입력 실패가 5회를 초과했습니다. 인증번호를 재발급해 주세요.'
          : `인증번호가 일치하지 않습니다. 남은 시도 횟수: ${5 - nextCount}회`,
        remainingAttempts: Math.max(0, 5 - nextCount)
      });
    }

    const [userRows] = await pool.query('SELECT * FROM users WHERE id = ? AND email = ?', [verification.user_id, verification.email]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: '연결할 영테크 계정을 찾을 수 없습니다.' });
    }

    const user = userRows[0];
    if (user.role === 'admin') {
      return res.status(403).json({ message: '관리자 계정은 이메일 인증만으로 간편로그인을 연결할 수 없습니다.' });
    }

    await pool.query(`UPDATE users SET ${config.idColumn} = ? WHERE id = ?`, [verification.provider_user_id, user.id]);
    await pool.query('UPDATE social_link_verifications SET completed_at = NOW() WHERE id = ?', [linkId]);
    await pool.query(
      'INSERT INTO social_link_history (user_id, provider, provider_user_id, method, result) VALUES (?, ?, ?, ?, ?)',
      [user.id, verification.provider, verification.provider_user_id, 'email', 'linked']
    );

    const [updatedRows] = await pool.query('SELECT * FROM users WHERE id = ?', [user.id]);
    await sendMail({
      to: updatedRows[0].email,
      subject: '[YoungTech] 간편로그인 연결 완료 안내',
      text: `${config.label} 간편로그인이 YoungTech 계정에 연결되었습니다.\n\n본인이 연결한 것이 아니라면 즉시 비밀번호를 변경하고 고객센터로 문의해 주세요.`
    });

    return completeSocialLogin(res, updatedRows[0], {
      linked: true,
      message: `${config.label} 간편로그인이 기존 영테크 계정에 연결되었습니다. 연결 완료 알림이 기존 이메일로 발송되었습니다.`
    });
  } catch (error) {
    console.error('Social Email Link Error:', error);
    return res.status(500).json({ message: '이메일 인증 연결 처리 중 오류가 발생했습니다.' });
  }
});

app.post('/api/auth/naver', async (req, res) => {
  const { code, state } = req.body;
  if (!code) {
    return res.status(400).json({ message: '인가 코드가 누락되었습니다.' });
  }

  const clientId = process.env.NAVER_CLIENT_ID || process.env.VITE_NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  let naverUser = null;
  const isMock = code === 'naver_mock_code_test' || !clientId || !clientSecret || clientSecret === 'undefined';

  if (isMock) {
    naverUser = {
      id: 'naver_mock_fixed_user_id',
      email: process.env.NAVER_MOCK_EMAIL || 'drone1997@naver.com',
      name: getDisplayNameFromProfile('', process.env.NAVER_MOCK_EMAIL || 'drone1997@naver.com'),
      emailVerified: true
    };
  } else {
    try {
      const tokenUrl = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${clientId.trim()}&client_secret=${clientSecret.trim()}&code=${code}&state=${state}`;
      const tokenRes = await fetch(tokenUrl, { method: 'POST' });
      const tokenData = await tokenRes.json();

      if (!tokenData.access_token) {
        return res.status(400).json({ message: '네이버 토큰 교환에 실패했습니다.', error: tokenData });
      }

      const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const profileData = await profileRes.json();

      if (profileData.resultcode !== '00') {
        return res.status(400).json({ message: '네이버 프로필 조회에 실패했습니다.', error: profileData });
      }

      naverUser = {
        id: profileData.response.id,
        email: profileData.response.email,
        name: getDisplayNameFromProfile(profileData.response.name, profileData.response.email),
        emailVerified: Boolean(profileData.response.email)
      };
    } catch (err) {
      console.error('Naver OAuth Error:', err);
      return res.status(500).json({ message: '네이버 인증 처리 중 서버 오류가 발생했습니다.' });
    }
  }

  try {
    const [existingBySocial] = await pool.query('SELECT * FROM users WHERE naver_id = ?', [naverUser.id]);
    if (existingBySocial.length > 0) {
      return completeSocialLogin(res, existingBySocial[0], {
        linked: false,
        message: '네이버 계정으로 로그인되었습니다.'
      });
    }

    const [existingByEmail] = await pool.query('SELECT * FROM users WHERE email = ?', [naverUser.email]);

    if (existingByEmail.length > 0) {
      const user = existingByEmail[0];

      if (user.naver_id === naverUser.id) {
        return completeSocialLogin(res, user, {
          linked: false,
          message: '네이버 계정으로 로그인되었습니다.'
        });
      }

      if (!user.naver_id) {
        return sendSocialLinkRequired(res, {
          provider: 'naver',
          providerUserId: naverUser.id,
          user,
          emailVerified: naverUser.emailVerified
        });
      }

      if (isMock && user.email === naverUser.email && String(user.naver_id || '').startsWith('naver_')) {
        await pool.query('UPDATE users SET naver_id = ? WHERE id = ?', [naverUser.id, user.id]);
        return completeSocialLogin(res, { ...user, naver_id: naverUser.id }, {
          linked: false,
          message: '네이버 계정 연결 정보를 최신 상태로 보정하고 로그인했습니다.'
        });
      }

      return sendSocialLinkRequired(res, {
        provider: 'naver',
        providerUserId: naverUser.id,
        user,
        emailVerified: naverUser.emailVerified
      });
    }

    const tempUserId = 'naver_' + Date.now();
    const tempPasswordHash = bcrypt.hashSync(Math.random().toString(36), 10);

    await pool.query(
      'INSERT INTO users (id, naver_id, email, password, name, role) VALUES (?, ?, ?, ?, ?, ?)',
      [tempUserId, naverUser.id, naverUser.email, tempPasswordHash, naverUser.name, 'user']
    );

    const token = jwt.sign(
      { id: tempUserId, email: naverUser.email, name: naverUser.name, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: tempUserId,
        email: naverUser.email,
        name: naverUser.name,
        role: 'user'
      },
      needsAdditionalInfo: false,
      message: '네이버 간편 로그인 계정 생성이 완료되었습니다.'
    });

  } catch (dbErr) {
    console.error('Social Login DB Sync Error:', dbErr);
    res.status(500).json({ message: '소셜 정보 동기화 중 데이터베이스 오류가 발생했습니다.' });
  }
});

// Kakao Social Login API
app.post('/api/auth/kakao', async (req, res) => {
  const { code, state } = req.body;
  if (!code) {
    return res.status(400).json({ message: '인가 코드가 누락되었습니다.' });
  }

  const clientId = (process.env.KAKAO_CLIENT_ID || process.env.VITE_KAKAO_CLIENT_ID || '').trim();
  const clientSecret = (process.env.KAKAO_CLIENT_SECRET || '').trim();

  let kakaoUser = null;
  const isMock = code === 'kakao_mock_code_test' || !clientId;

  if (isMock) {
    kakaoUser = {
      id: 'kakao_mock_fixed_user_id',
      email: 'kakao_test_fixed_user@kakao.com',
      name: '',
      emailVerified: true
    };
  } else {
    try {
      const tokenUrl = 'https://kauth.kakao.com/oauth/token';
      const redirectBaseUrl = (req.headers.origin || process.env.PUBLIC_BASE_URL || getPublicBaseUrl(req)).replace(/\/$/, '');
      const redirectUri = `${redirectBaseUrl}/oauth/callback/kakao`;
      
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('client_id', clientId);
      params.append('redirect_uri', redirectUri);
      params.append('code', code);
      if (clientSecret) {
        params.append('client_secret', clientSecret);
      }

      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: params
      });
      const tokenData = await tokenRes.json();

      if (!tokenData.access_token) {
        return res.status(400).json({ message: '카카오 토큰 교환에 실패했습니다.', error: tokenData });
      }

      const profileRes = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { 
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
        }
      });
      const profileData = await profileRes.json();

      if (!profileData.id) {
        return res.status(400).json({ message: '카카오 프로필 조회에 실패했습니다.', error: profileData });
      }

      kakaoUser = {
        id: String(profileData.id),
        email: profileData.kakao_account?.email || `kakao_${profileData.id}@kakao.com`,
        name: getDisplayNameFromProfile(profileData.properties?.nickname, profileData.kakao_account?.email || `kakao_${profileData.id}@kakao.com`),
        emailVerified: profileData.kakao_account?.is_email_verified !== false && Boolean(profileData.kakao_account?.email)
      };
    } catch (err) {
      console.error('Kakao OAuth Error:', err);
      return res.status(500).json({ message: '카카오 인증 처리 중 서버 오류가 발생했습니다.' });
    }
  }

  try {
    const [existingBySocial] = await pool.query('SELECT * FROM users WHERE kakao_id = ?', [kakaoUser.id]);
    if (existingBySocial.length > 0) {
      return completeSocialLogin(res, existingBySocial[0], {
        linked: false,
        message: '카카오 계정으로 로그인되었습니다.'
      });
    }

    const [existingByEmail] = await pool.query('SELECT * FROM users WHERE email = ?', [kakaoUser.email]);

    if (existingByEmail.length > 0) {
      const user = existingByEmail[0];

      if (user.kakao_id === kakaoUser.id) {
        return completeSocialLogin(res, user, {
          linked: false,
          message: '카카오 계정으로 로그인되었습니다.'
        });
      }

      if (!user.kakao_id) {
        return sendSocialLinkRequired(res, {
          provider: 'kakao',
          providerUserId: kakaoUser.id,
          user,
          emailVerified: kakaoUser.emailVerified
        });
      }

      return sendSocialLinkRequired(res, {
        provider: 'kakao',
        providerUserId: kakaoUser.id,
        user,
        emailVerified: kakaoUser.emailVerified
      });
    }

    const tempUserId = 'kakao_' + Date.now();
    const tempPasswordHash = bcrypt.hashSync(Math.random().toString(36), 10);

    await pool.query(
      'INSERT INTO users (id, kakao_id, email, password, name, role) VALUES (?, ?, ?, ?, ?, ?)',
      [tempUserId, kakaoUser.id, kakaoUser.email, tempPasswordHash, kakaoUser.name, 'user']
    );

    const token = jwt.sign(
      { id: tempUserId, email: kakaoUser.email, name: kakaoUser.name, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: tempUserId,
        email: kakaoUser.email,
        name: kakaoUser.name,
        role: 'user'
      },
      needsAdditionalInfo: false,
      message: '카카오 간편 로그인 계정 생성이 완료되었습니다.'
    });

  } catch (dbErr) {
    console.error('Kakao Login DB Sync Error:', dbErr);
    res.status(500).json({ message: '소셜 정보 동기화 중 데이터베이스 오류가 발생했습니다.' });
  }
});

// Google Social Login API
app.post('/api/auth/google', async (req, res) => {
  const { code, state, accessToken, credential, allowSignup = false } = req.body;

  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();

  let googleUser = null;
  const isMock = code === 'google_mock_code_test';

  if (accessToken || credential) {
    const token = accessToken || credential;
    try {
      const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`);
      const tokenInfo = await tokenInfoRes.json();

      if (!tokenInfo || tokenInfo.error || tokenInfo.error_description) {
        return res.status(400).json({ message: '구글 토큰 검증에 실패했습니다.', error: tokenInfo });
      }

      const audience = tokenInfo.audience || tokenInfo.aud || tokenInfo.issued_to;
      if (clientId && audience && audience !== clientId) {
        return res.status(400).json({ message: '구글 토큰의 발급 대상이 현재 앱과 일치하지 않습니다.' });
      }

      if (!tokenInfo.email) {
        return res.status(400).json({ message: '구글 계정에서 이메일 정보를 가져오지 못했습니다.' });
      }

      googleUser = {
        id: tokenInfo.sub || tokenInfo.user_id || tokenInfo.id || tokenInfo.email,
        email: tokenInfo.email,
        name: getDisplayNameFromProfile(tokenInfo.name || tokenInfo.given_name, tokenInfo.email),
        emailVerified: tokenInfo.email_verified === true || tokenInfo.email_verified === 'true'
      };
    } catch (err) {
      console.error('Google Access Token Verification Error:', err);
      return res.status(500).json({ message: '구글 토큰 검증 중 서버 오류가 발생했습니다.', error: err.message });
    }
  } else if (isMock) {
    googleUser = {
      id: 'google_mock_fixed_user_id',
      email: 'google_test_fixed_user@gmail.com',
      name: getDisplayNameFromProfile('', 'google_test_fixed_user@gmail.com'),
      emailVerified: true
    };
  } else {
    if (!code) {
      return res.status(400).json({ message: '인가 코드 또는 액세스 토큰이 누락되었습니다.' });
    }

    if (!clientId || !clientSecret || clientId === 'undefined' || clientSecret === 'undefined') {
      return res.status(500).json({
        message: '구글 OAuth가 설정되지 않았습니다. GOOGLE_CLIENT_ID와 GOOGLE_CLIENT_SECRET을 확인해 주세요.'
      });
    }

    try {
      const tokenUrl = 'https://oauth2.googleapis.com/token';
      const reqOrigin = req.headers.origin || `http://${req.headers.host}` || 'http://localhost:5174';
      const redirectUri = `${reqOrigin}/oauth/callback/google`;

      const params = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      });

      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const tokenData = await tokenRes.json();

      if (!tokenData.access_token) {
        return res.status(400).json({ message: '구글 토큰 교환에 실패했습니다.', error: tokenData });
      }

      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const profileData = await profileRes.json();

      if (!profileData.id) {
        return res.status(400).json({ message: '구글 프로필 정보 조회에 실패했습니다.', error: profileData });
      }

      googleUser = {
        id: profileData.id,
        email: profileData.email,
        name: getDisplayNameFromProfile(profileData.name, profileData.email),
        emailVerified: profileData.verified_email !== false
      };
    } catch (err) {
      console.error('Google OAuth Exception:', err);
      return res.status(500).json({ message: '구글 인증 처리 중 서버 오류가 발생했습니다.', error: err.message });
    }
  }

  try {
    if (!googleUser.email) {
      return res.status(400).json({ message: '구글 계정에서 이메일 정보를 가져오지 못했습니다.' });
    }

    const [existingBySocial] = await pool.query('SELECT * FROM users WHERE google_id = ?', [googleUser.id]);
    if (existingBySocial.length > 0) {
      return completeSocialLogin(res, existingBySocial[0], {
        linked: false,
        message: '구글 계정으로 로그인되었습니다.'
      });
    }

    const [existingByEmail] = await pool.query('SELECT * FROM users WHERE email = ?', [googleUser.email]);

    if (existingByEmail.length > 0) {
      const user = existingByEmail[0];

      if (user.google_id === googleUser.id) {
        return completeSocialLogin(res, user, {
          linked: false,
          message: '구글 계정으로 로그인되었습니다.'
        });
      }

      if (!user.google_id) {
        return sendSocialLinkRequired(res, {
          provider: 'google',
          providerUserId: googleUser.id,
          user,
          emailVerified: googleUser.emailVerified
        });
      }

      return sendSocialLinkRequired(res, {
        provider: 'google',
        providerUserId: googleUser.id,
        user,
        emailVerified: googleUser.emailVerified
      });
    }

    if (!allowSignup) {
      return res.status(404).json({
        success: false,
        needsSignup: true,
        message: '가입되지 않은 구글 계정입니다. 먼저 구글 간편가입을 진행해 주세요.'
      });
    }

    const newUserId = 'google_' + Date.now();
    const tempPasswordHash = bcrypt.hashSync(Math.random().toString(36), 10);

    await pool.query(
      'INSERT INTO users (id, google_id, email, password, name, role) VALUES (?, ?, ?, ?, ?, ?)',
      [newUserId, googleUser.id, googleUser.email, tempPasswordHash, googleUser.name, 'user']
    );

    const token = jwt.sign(
      { id: newUserId, email: googleUser.email, name: googleUser.name, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: newUserId,
        email: googleUser.email,
        name: googleUser.name,
        role: 'user'
      },
      linked: false,
      created: true,
      needsAdditionalInfo: false,
      message: '구글 계정으로 간편가입이 완료되었습니다.'
    });

  } catch (dbErr) {
    console.error('Google Login DB Sync Error:', dbErr);
    res.status(500).json({ message: '소셜 정보 동기화 중 데이터베이스 오류가 발생했습니다.' });
  }
});

app.put('/api/auth/profile-update', authenticateToken, async (req, res) => {
  const { phone, address } = req.body;
  if (!phone || !address) {
    return res.status(400).json({ message: '연락처와 배송 주소를 모두 입력해주세요.' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    await pool.query('UPDATE users SET phone = ?, address = ? WHERE id = ?', [phone, address, req.user.id]);
    res.json({ success: true, message: '배송지 및 연락처 정보 등록이 완료되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류로 프로필 갱신에 실패했습니다.' });
  }
});

const normalizePhoneNumber = (phone) => String(phone || '').replace(/\D/g, '');

app.get('/api/addresses', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, updated_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Address List Error:', error);
    res.status(500).json({ message: '배송지 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

app.post('/api/addresses', authenticateToken, async (req, res) => {
  const {
    label = '배송지',
    recipient,
    phone,
    postcode = '',
    base_address,
    detail_address = '',
    delivery_memo = '',
    is_default = false
  } = req.body;
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!recipient || !normalizedPhone || !base_address) {
    return res.status(400).json({ message: '수령인, 연락처, 기본 주소를 입력해 주세요.' });
  }
  if (!/^01\d{8,9}$/.test(normalizedPhone)) {
    return res.status(400).json({ message: '휴대폰 번호를 올바르게 입력해 주세요. 예: 010-1234-5678' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (is_default) {
      await connection.query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?', [req.user.id]);
      await connection.query('UPDATE users SET phone = ?, address = ? WHERE id = ?', [normalizedPhone, base_address, req.user.id]);
    }
    const [result] = await connection.query(
      `INSERT INTO user_addresses
       (user_id, label, recipient, phone, postcode, base_address, detail_address, delivery_memo, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        String(label || '배송지').slice(0, 100),
        recipient.trim(),
        normalizedPhone,
        String(postcode || '').slice(0, 10),
        base_address.trim(),
        detail_address.trim(),
        delivery_memo,
        Boolean(is_default)
      ]
    );
    await connection.commit();
    res.status(201).json({ success: true, id: result.insertId, message: '배송지가 저장되었습니다.' });
  } catch (error) {
    await connection.rollback();
    console.error('Address Create Error:', error);
    res.status(500).json({ message: '배송지 저장 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

app.put('/api/addresses/:id', authenticateToken, async (req, res) => {
  const {
    label = '배송지',
    recipient,
    phone,
    postcode = '',
    base_address,
    detail_address = '',
    delivery_memo = '',
    is_default = false
  } = req.body;
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!recipient || !normalizedPhone || !base_address) {
    return res.status(400).json({ message: '수령인, 연락처, 기본 주소를 입력해 주세요.' });
  }
  if (!/^01\d{8,9}$/.test(normalizedPhone)) {
    return res.status(400).json({ message: '휴대폰 번호를 올바르게 입력해 주세요. 예: 010-1234-5678' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (is_default) {
      await connection.query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?', [req.user.id]);
      await connection.query('UPDATE users SET phone = ?, address = ? WHERE id = ?', [normalizedPhone, base_address, req.user.id]);
    }
    const [result] = await connection.query(
      `UPDATE user_addresses
       SET label = ?, recipient = ?, phone = ?, postcode = ?, base_address = ?, detail_address = ?, delivery_memo = ?, is_default = ?
       WHERE id = ? AND user_id = ?`,
      [
        String(label || '배송지').slice(0, 100),
        recipient.trim(),
        normalizedPhone,
        String(postcode || '').slice(0, 10),
        base_address.trim(),
        detail_address.trim(),
        delivery_memo,
        Boolean(is_default),
        req.params.id,
        req.user.id
      ]
    );
    await connection.commit();
    if (result.affectedRows === 0) return res.status(404).json({ message: '배송지를 찾을 수 없습니다.' });
    res.json({ success: true, message: '배송지가 수정되었습니다.' });
  } catch (error) {
    await connection.rollback();
    console.error('Address Update Error:', error);
    res.status(500).json({ message: '배송지 수정 중 오류가 발생했습니다.' });
  } finally {
    connection.release();
  }
});

app.delete('/api/addresses/:id', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM user_addresses WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: '배송지를 찾을 수 없습니다.' });
    res.json({ success: true, message: '배송지가 삭제되었습니다.' });
  } catch (error) {
    console.error('Address Delete Error:', error);
    res.status(500).json({ message: '배송지 삭제 중 오류가 발생했습니다.' });
  }
});

// ==========================================
// File Upload API
// ==========================================
app.post('/api/upload', requireAdmin, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '업로드할 파일이 없습니다.' });
    }
    const fileUrl = `${getPublicBaseUrl(req)}/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: '파일 업로드 실패' });
  }
});

// ==========================================
// Categories APIs
// ==========================================
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

// Reorder Categories
app.put('/api/categories/reorder', requireAdmin, async (req, res) => {
  const { categoryIds } = req.body; // Array of IDs in the desired order
  if (!Array.isArray(categoryIds)) {
    return res.status(400).json({ message: '올바르지 않은 품목군 목록 형식입니다.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (let i = 0; i < categoryIds.length; i++) {
      await connection.query('UPDATE categories SET sort_order = ? WHERE id = ?', [i + 1, categoryIds[i]]);
    }
    await connection.commit();
    res.json({ success: true, message: '품목군 순서가 업데이트되었습니다.' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류로 순서 저장에 실패했습니다.' });
  } finally {
    connection.release();
  }
});

app.post('/api/categories', requireAdmin, async (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) {
    return res.status(400).json({ message: '품목군 ID와 이름을 입력해주세요.' });
  }
  try {
    const [existing] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    if (existing.length > 0) {
      return res.status(400).json({ message: '이미 존재하는 품목군 ID입니다.' });
    }
    // Set default sort_order as max + 1
    const [maxOrderRows] = await pool.query('SELECT MAX(sort_order) as max_val FROM categories');
    const nextOrder = (maxOrderRows[0].max_val || 0) + 1;

    await pool.query('INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)', [id, name, nextOrder]);
    res.status(201).json({ success: true, message: '품목군이 추가되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

app.delete('/api/categories/:id', requireAdmin, async (req, res) => {
  try {
    const [prods] = await pool.query('SELECT COUNT(*) as count FROM products WHERE category = ? AND is_deleted = FALSE', [req.params.id]);
    if (prods[0].count > 0) {
      return res.status(400).json({ 
        message: '해당 품목군에 등록된 상품이 존재하여 삭제할 수 없습니다. 상품들의 카테고리를 먼저 변경하거나 삭제해주세요.' 
      });
    }
    await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: '품목군이 삭제되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

app.put('/api/categories/:id', requireAdmin, async (req, res) => {
  const { name } = req.body;
  const { id } = req.params;
  if (!name) {
    return res.status(400).json({ message: '품목군 이름을 입력해주세요.' });
  }
  try {
    await pool.query('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
    res.json({ success: true, message: '품목군 이름이 수정되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

// ==========================================
// ==========================================
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE is_deleted = FALSE ORDER BY sort_order ASC, created_at DESC');
    // Ensure specs parsing
    const parsedRows = rows.map(r => ({
      ...r,
      specs: typeof r.specs === 'string' ? JSON.parse(r.specs) : r.specs
    }));
    res.json(parsedRows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

// Update single/multiple products sort_order
app.put('/api/products/reorder', requireAdmin, async (req, res) => {
  const { orders } = req.body; // Array of { id, sort_order }
  if (!Array.isArray(orders)) {
    return res.status(400).json({ message: '올바르지 않은 상품 순서 데이터 형식입니다.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const item of orders) {
      await connection.query('UPDATE products SET sort_order = ? WHERE id = ? AND is_deleted = FALSE', [item.sort_order, item.id]);
    }
    await connection.commit();
    res.json({ success: true, message: '상품 순서가 정상적으로 업데이트되었습니다.' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류로 순서 저장에 실패했습니다.' });
  } finally {
    connection.release();
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ? AND is_deleted = FALSE', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    const product = rows[0];
    product.specs = typeof product.specs === 'string' ? JSON.parse(product.specs) : product.specs;
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

// Price validation check
async function validateProductPrice(price, category, id = null) {
  // 1. Minimum limit check
  if (price < 1000) {
    return '가격은 최소 1,000원 이상이어야 합니다.';
  }

  // 2. Average price deviation check (10x higher or 10x lower than category average)
  let query = 'SELECT AVG(price) as avg_price FROM products WHERE category = ? AND is_deleted = FALSE';
  let params = [category];
  if (id) {
    query += ' AND id != ?';
    params.push(id);
  }

  const [rows] = await pool.query(query, params);
  const avgPrice = rows[0].avg_price;

  if (avgPrice) {
    if (price > avgPrice * 10) {
      return `입력된 가격(${price.toLocaleString()}원)이 해당 카테고리 평균 가격(${Math.round(avgPrice).toLocaleString()}원)보다 10배 이상 높습니다. 등록 가격을 다시 검토해 주세요.`;
    }
    if (price < avgPrice / 10) {
      return `입력된 가격(${price.toLocaleString()}원)이 해당 카테고리 평균 가격(${Math.round(avgPrice).toLocaleString()}원)보다 10배 이상 낮습니다. 등록 가격을 다시 검토해 주세요.`;
    }
  }
  return null;
}

app.post('/api/products', requireAdmin, async (req, res) => {
  const { id, name, category, price, image, description, specs, stock } = req.body;
  if (!id || !name || !category || !price) {
    return res.status(400).json({ message: '필수 상품 정보(ID, 상품명, 카테고리, 가격)를 입력해주세요.' });
  }

  const priceWarning = await validateProductPrice(Number(price), category);
  if (priceWarning) {
    return res.status(400).json({ message: priceWarning, isWarning: true });
  }

  try {
    const [existing] = await pool.query('SELECT id, is_deleted FROM products WHERE id = ?', [id]);
    if (existing.length > 0) {
      if (existing[0].is_deleted) {
        return res.status(409).json({
          message: '삭제 처리된 상품 ID입니다. 주문 이력 보호를 위해 같은 ID는 재사용할 수 없습니다. 새 상품 ID를 사용해 주세요.'
        });
      }
      return res.status(400).json({ message: '이미 존재하는 상품 ID입니다.' });
    }

    await pool.query(
      'INSERT INTO products (id, name, category, price, image, description, specs, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, category, price, image, description, JSON.stringify(specs || {}), stock || 50]
    );

    res.status(201).json({ message: '상품이 성공적으로 등록되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

app.put('/api/products/:id', requireAdmin, async (req, res) => {
  const { name, category, price, image, description, specs, stock } = req.body;
  const productId = req.params.id;

  const priceWarning = await validateProductPrice(Number(price), category, productId);
  if (priceWarning) {
    return res.status(400).json({ message: priceWarning, isWarning: true });
  }

  try {
    const [existing] = await pool.query('SELECT * FROM products WHERE id = ? AND is_deleted = FALSE', [productId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }

    await pool.query(
      'UPDATE products SET name = ?, category = ?, price = ?, image = ?, description = ?, specs = ?, stock = ? WHERE id = ?',
      [name, category, price, image, description, JSON.stringify(specs || {}), stock, productId]
    );

    res.json({ message: '상품 정보가 수정되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT * FROM products WHERE id = ? AND is_deleted = FALSE', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }

    await pool.query('UPDATE products SET is_deleted = TRUE, deleted_at = NOW(), stock = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: '상품이 삭제 처리되었습니다. 주문 이력 보호를 위해 실제 데이터는 보존됩니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

// Batch delete products
app.post('/api/products/batch-delete', requireAdmin, async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: '삭제할 상품 ID 리스트가 필요합니다.' });
  }
  try {
    await pool.query('UPDATE products SET is_deleted = TRUE, deleted_at = NOW(), stock = 0 WHERE id IN (?) AND is_deleted = FALSE', [ids]);
    res.json({ success: true, message: `${ids.length}개의 상품이 삭제 처리되었습니다. 주문 이력 보호를 위해 실제 데이터는 보존됩니다.` });
  } catch (error) {
    console.error('Batch Delete Error:', error);
    res.status(500).json({ message: '상품 일괄 삭제 중 서버 내부 오류가 발생했습니다.' });
  }
});

// Batch mark products as out of stock (stock = 0)
app.post('/api/products/batch-out-of-stock', requireAdmin, async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: '품절 처리할 상품 ID 리스트가 필요합니다.' });
  }
  try {
    await pool.query('UPDATE products SET stock = 0 WHERE id IN (?) AND is_deleted = FALSE', [ids]);
    res.json({ success: true, message: `${ids.length}개의 상품이 품절 처리되었습니다.` });
  } catch (error) {
    console.error('Batch Out-Of-Stock Error:', error);
    res.status(500).json({ message: '상품 일괄 품절 처리 중 서버 내부 오류가 발생했습니다.' });
  }
});

// ==========================================
// Orders APIs
// ==========================================
app.post('/api/orders', authenticateToken, async (req, res) => {
  const {
    total_amount,
    order_items,
    address,
    payment_method = 'mock_card',
    payment_card_type = 'personal',
    tax_document_type = 'card_receipt',
    tax_document_status = 'issued_by_pg',
    tax_note = ''
  } = req.body;
  if (!total_amount || !order_items || !address) {
    return res.status(400).json({ message: '주문 정보가 누락되었습니다.' });
  }

  const normalizedPaymentMethod = payment_method === 'mock_card' ? 'mock_card' : 'mock_card';
  const normalizedCardType = payment_card_type === 'corporate' ? 'corporate' : 'personal';
  const normalizedTaxType = tax_document_type === 'cash_receipt' ? 'cash_receipt' : 'card_receipt';
  const normalizedTaxStatus = normalizedTaxType === 'card_receipt'
    ? 'issued_by_pg'
    : (tax_document_status || 'requested');
  const taxInvoiceRequired = false;

  const orderId = 'ORD_' + Date.now();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Insert Order
    const itemsWithStatus = order_items.map(item => ({
      ...item,
      status: item.status || 'pending'
    }));

    await connection.query(
      `INSERT INTO orders
       (id, user_id, total_amount, payment_method, payment_card_type, tax_document_type, tax_document_status, tax_invoice_required, tax_note, order_items, address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        req.user.id,
        total_amount,
        normalizedPaymentMethod,
        normalizedCardType,
        normalizedTaxType,
        normalizedTaxStatus,
        taxInvoiceRequired,
        tax_note,
        JSON.stringify(itemsWithStatus),
        address,
        'pending'
      ]
    );

    // Update stock & Update analytics
    for (const item of order_items) {
      await connection.query(
        'UPDATE products SET stock = GREATEST(stock - ?, 0) WHERE id = ?',
        [item.quantity, item.id]
      );
    }

    const todayString = new Date().toISOString().split('T')[0];
    await connection.query(`
      INSERT INTO analytics (date, revenue, visitors) VALUES (?, ?, 1)
      ON DUPLICATE KEY UPDATE revenue = revenue + VALUES(revenue)
    `, [todayString, total_amount]);

    await connection.commit();
    res.status(201).json({ message: '주문이 접수되었습니다.', orderId });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  } finally {
    connection.release();
  }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT o.*, 
             c.claim_type, 
             c.status AS claim_status, 
             c.reason AS claim_reason, 
             c.pickup_type AS claim_pickup_type, 
             c.answer AS claim_answer, 
             c.shipping_fee AS claim_shipping_fee,
             c.refund_amount AS claim_refund_amount
      FROM orders o
      LEFT JOIN (
        SELECT * FROM claims 
        WHERE id IN (
          SELECT MAX(id) FROM claims GROUP BY order_id
        )
      ) c ON o.id = c.order_id
      WHERE o.user_id = ? 
      ORDER BY o.created_at DESC
    `, [req.user.id]);
    const parsedRows = rows.map(r => ({
      ...r,
      order_items: typeof r.order_items === 'string' ? JSON.parse(r.order_items) : r.order_items
    }));
    res.json(parsedRows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

app.get('/api/orders/all', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT o.*, 
             u.name as user_name, 
             u.email as user_email,
             c.claim_type, 
             c.status AS claim_status, 
             c.reason AS claim_reason, 
             c.reason_type AS claim_reason_type,
             c.pickup_type AS claim_pickup_type,
             c.answer AS claim_answer, 
             c.shipping_fee AS claim_shipping_fee,
             c.refund_amount AS claim_refund_amount,
             c.product_id AS claim_product_id
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN (
        SELECT * FROM claims 
        WHERE id IN (
          SELECT MAX(id) FROM claims GROUP BY order_id
        )
      ) c ON o.id = c.order_id
      ORDER BY o.created_at DESC
    `);
    const parsedRows = rows.map(r => ({
      ...r,
      order_items: typeof r.order_items === 'string' ? JSON.parse(r.order_items) : r.order_items
    }));
    res.json(parsedRows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

app.post('/api/admin/users/:id/detail', requireAdmin, async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ message: '관리자 비밀번호를 입력해 주세요.' });
  }

  try {
    const [adminRows] = await pool.query('SELECT password FROM users WHERE id = ? AND role = ?', [req.user.id, 'admin']);
    if (adminRows.length === 0) {
      return res.status(403).json({ message: '관리자 계정을 확인할 수 없습니다.' });
    }

    const passwordMatch = bcrypt.compareSync(password, adminRows[0].password);
    if (!passwordMatch) {
      return res.status(401).json({ message: '관리자 비밀번호가 일치하지 않습니다.' });
    }

    const [userRows] = await pool.query(
      'SELECT id, email, name, phone, address, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ message: '고객 정보를 찾을 수 없습니다.' });
    }

    const [orderRows] = await pool.query(
      `SELECT id, total_amount, order_items, address, status, carrier, tracking_number, created_at, confirmed_at
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.params.id]
    );

    const parsedOrders = orderRows.map(order => ({
      ...order,
      order_items: typeof order.order_items === 'string' ? JSON.parse(order.order_items) : order.order_items
    }));

    const [claimRows] = await pool.query(
      `SELECT id, order_id, claim_type, reason, status, reason_type, shipping_fee, refund_amount, created_at, answer
       FROM claims
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.params.id]
    );

    const totalSpent = parsedOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

    res.json({
      user: userRows[0],
      summary: {
        order_count: parsedOrders.length,
        total_spent: totalSpent,
        claim_count: claimRows.length,
        last_order_at: parsedOrders[0]?.created_at || null
      },
      orders: parsedOrders,
      claims: claimRows
    });
  } catch (error) {
    console.error('Admin User Detail Error:', error);
    res.status(500).json({ message: '고객 상세정보 조회 중 서버 오류가 발생했습니다.' });
  }
});

app.put('/api/orders/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ message: '주문 상태 값이 필요합니다.' });

  try {
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });

    const order = rows[0];
    let items = [];
    try {
      items = typeof order.order_items === 'string' ? JSON.parse(order.order_items) : order.order_items;
    } catch (e) {
      items = order.order_items || [];
    }
    const updatedItems = items.map(item => ({ ...item, status }));

    await pool.query(
      'UPDATE orders SET status = ?, order_items = ? WHERE id = ?', 
      [status, JSON.stringify(updatedItems), req.params.id]
    );
    res.json({ message: `주문 상태가 '${status}'(으)로 업데이트되었습니다.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

app.put('/api/admin/orders/:id/delivery', requireAdmin, async (req, res) => {
  const { carrier, tracking_number } = req.body;
  if (!carrier || !tracking_number) {
    return res.status(400).json({ message: '택배사와 송장번호는 필수 입력 사항입니다.' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });

    const order = rows[0];
    let items = [];
    try {
      items = typeof order.order_items === 'string' ? JSON.parse(order.order_items) : order.order_items;
    } catch (e) {
      items = order.order_items || [];
    }
    const updatedItems = items.map(item => ({ ...item, status: 'shipping' }));

    await pool.query(
      'UPDATE orders SET carrier = ?, tracking_number = ?, status = ?, order_items = ? WHERE id = ?',
      [carrier, tracking_number, 'shipping', JSON.stringify(updatedItems), req.params.id]
    );
    res.json({ success: true, message: '배송 정보가 성공적으로 등록되었으며, 배송 상태가 배송중으로 변경되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

app.put('/api/admin/orders/:id/complete', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });

    const order = rows[0];
    let items = [];
    try {
      items = typeof order.order_items === 'string' ? JSON.parse(order.order_items) : order.order_items;
    } catch (e) {
      items = order.order_items || [];
    }
    const updatedItems = items.map(item => ({ ...item, status: 'delivered' }));

    await pool.query(
      'UPDATE orders SET status = ?, order_items = ? WHERE id = ?', 
      ['delivered', JSON.stringify(updatedItems), req.params.id]
    );
    res.json({ success: true, message: '배송 완료 처리가 성공적으로 완료되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

// ==========================================
// Purchase Confirmation & Returns/Exchanges & Settlement APIs
// ==========================================

// 1. 고객 구매확정 처리
// 1. 고객 구매확정 처리 (개별 상품 및 전체 지원)
app.put('/api/orders/:id/confirm', authenticateToken, async (req, res) => {
  const { product_id } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });

    const order = rows[0];
    let items = [];
    try {
      items = typeof order.order_items === 'string' ? JSON.parse(order.order_items) : order.order_items;
    } catch (e) {
      items = order.order_items || [];
    }

    let updatedAmount = 0;
    let anyUpdated = false;

    const updatedItems = items.map(item => {
      const targetMatch = !product_id || item.id === product_id;
      if (targetMatch && (item.status === 'delivered' || item.status === 'shipping' || !item.status)) {
        updatedAmount += item.price * item.quantity;
        anyUpdated = true;
        return { ...item, status: 'confirmed' };
      }
      return item;
    });

    if (!anyUpdated) {
      return res.status(400).json({ message: '구매확정 가능한 상품이 없거나 이미 처리되었습니다.' });
    }

    const allConfirmed = updatedItems.every(item => item.status === 'confirmed' || item.status === 'cancelled' || item.status === 'refunded' || item.status === 'returned');
    const nextOrderStatus = allConfirmed ? 'confirmed' : 'part_confirmed';

    await pool.query(
      'UPDATE orders SET status = ?, order_items = ?, confirmed_at = NOW() WHERE id = ?', 
      [nextOrderStatus, JSON.stringify(updatedItems), req.params.id]
    );

    const todayStr = new Date().toISOString().split('T')[0];
    await pool.query(
      `INSERT INTO analytics (date, revenue, visitors) VALUES (?, ?, 0) 
       ON DUPLICATE KEY UPDATE revenue = revenue + ?`,
      [todayStr, updatedAmount, updatedAmount]
    );

    res.json({ success: true, message: '구매확정이 완료되었습니다.', nextStatus: nextOrderStatus });
  } catch (error) {
    console.error('Purchase Confirm Error:', error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

// 1-1. 고객 주문 취소 (개별 상품 및 전체 지원)
app.put('/api/orders/:id/cancel', authenticateToken, async (req, res) => {
  const { product_id } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    const order = rows[0];
    let items = [];
    try {
      items = typeof order.order_items === 'string' ? JSON.parse(order.order_items) : order.order_items;
    } catch (e) {
      items = order.order_items || [];
    }

    let anyMatch = false;
    let hasShippingItem = false;

    for (const item of items) {
      const isTarget = !product_id || item.id === product_id;
      if (isTarget) {
        anyMatch = true;
        const currentItemStatus = item.status || order.status;
        if (currentItemStatus !== 'pending' && currentItemStatus !== 'preparing') {
          await connection.rollback();
          return res.status(400).json({ message: '결제완료(배송대기) 또는 배송준비중 상태의 상품만 취소할 수 있습니다.' });
        }
        if (currentItemStatus === 'preparing') {
          hasShippingItem = true;
        }
      }
    }

    if (!anyMatch) {
      await connection.rollback();
      return res.status(400).json({ message: '취소할 대상 상품을 찾을 수 없습니다.' });
    }

    let nextOrderStatus = order.status;
    const todayString = new Date().toISOString().split('T')[0];

    const updatedItems = [];
    for (const item of items) {
      const isTarget = !product_id || item.id === product_id;
      if (isTarget) {
        const currentItemStatus = item.status || order.status;
        if (currentItemStatus === 'pending') {
          updatedItems.push({ ...item, status: 'cancelled' });
          await connection.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.id]);
          
          const cancelAmount = item.price * item.quantity;
          await connection.query(`
            INSERT INTO analytics (date, revenue, visitors) VALUES (?, -?, 0)
            ON DUPLICATE KEY UPDATE revenue = revenue - ?
          `, [todayString, cancelAmount, cancelAmount]);
        } else {
          updatedItems.push({ ...item, status: 'cancel_requested' });
        }
      } else {
        updatedItems.push(item);
      }
    }

    nextOrderStatus = deriveOrderStatusFromItems(updatedItems, order.status);

    await connection.query(
      'UPDATE orders SET status = ?, order_items = ? WHERE id = ?', 
      [nextOrderStatus, JSON.stringify(updatedItems), req.params.id]
    );

    await connection.commit();
    
    if (hasShippingItem) {
      return res.json({ success: true, message: '주문 취소가 요청되었습니다. 관리자 승인 후 최종 취소 처리됩니다.', nextStatus: nextOrderStatus });
    } else {
      return res.json({ success: true, message: '주문이 성공적으로 취소되었으며, 재고가 복구되었습니다.', nextStatus: nextOrderStatus });
    }
  } catch (error) {
    await connection.rollback();
    console.error('Order Cancel Error:', error);
    res.status(500).json({ message: '서버 내부 오류' });
  } finally {
    connection.release();
  }
});

// 스마트택배 API 모의(Mock) 예약 연동
async function requestSweetTrackerPickup(orderId, address, userName) {
  // Sweet Tracker API 예약 스펙 시뮬레이션
  console.log(`[스마트택배 API] 반품/교환 수거 예약 접수`);
  console.log(`- 주문: ${orderId}\n- 수거지: ${address}\n- 수거인: ${userName}`);
  return 'ST-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000);
}

// 2. 고객 반품/교환 신청
app.post('/api/orders/:id/claim', authenticateToken, async (req, res) => {
  const { claim_type, reason, reason_type, pickup_type, product_id } = req.body;
  if (!claim_type || !reason || !product_id) {
    return res.status(400).json({ message: '요청 타입, 대상 상품 ID, 사유를 모두 입력해주세요.' });
  }
  if (!['return', 'exchange', 'refund'].includes(claim_type)) {
    return res.status(400).json({ message: '유효하지 않은 요청 타입입니다.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT o.*, u.name as user_name FROM orders o 
       JOIN users u ON o.user_id = u.id 
       WHERE o.id = ? AND o.user_id = ?`, 
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    const order = rows[0];
    let items = [];
    try {
      items = typeof order.order_items === 'string' ? JSON.parse(order.order_items) : order.order_items;
    } catch (e) {
      items = order.order_items || [];
    }

    const targetItem = items.find(item => item.id === product_id);
    if (!targetItem) {
      await connection.rollback();
      return res.status(404).json({ message: '주문 내역에서 대상 상품을 찾을 수 없습니다.' });
    }

    const currentItemStatus = targetItem.status || order.status;
    const allowedStatuses = ['shipping', 'delivered', 'confirmed'];
    if (!allowedStatuses.includes(currentItemStatus)) {
      await connection.rollback();
      return res.status(400).json({ message: '배송 중, 배송 완료, 또는 구매 확정 상태의 상품만 클레임 신청 가능합니다.' });
    }

    if (currentItemStatus === 'confirmed' && claim_type !== 'refund') {
      await connection.rollback();
      return res.status(400).json({ message: '구매 확정 후에는 환불 신청만 가능합니다.' });
    }

    const itemAmount = targetItem.price * targetItem.quantity;
    let shipping_fee = 0;
    let refund_amount = itemAmount;

    const isBuyerReason = reason_type === 'buyer';
    if (isBuyerReason) {
      if (claim_type === 'refund' || claim_type === 'return') {
        shipping_fee = 3500;
        refund_amount = Math.max(0, itemAmount - shipping_fee);
      } else if (claim_type === 'exchange') {
        shipping_fee = 7000;
        refund_amount = itemAmount;
      }
    } else {
      shipping_fee = 0;
      refund_amount = itemAmount;
    }

    let sweettracker_receipt_no = null;
    const isPickupRequested = pickup_type === 'pickup';
    if (isPickupRequested && (claim_type === 'return' || claim_type === 'exchange' || claim_type === 'refund')) {
      sweettracker_receipt_no = await requestSweetTrackerPickup(order.id, order.address, order.user_name);
    }

    await connection.query(
      `INSERT INTO claims (order_id, user_id, claim_type, reason, status, reason_type, pickup_type, shipping_fee, refund_amount, sweettracker_receipt_no, product_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.id, 
        req.user.id, 
        claim_type, 
        reason, 
        'requested', 
        reason_type || 'buyer', 
        pickup_type || 'pickup', 
        shipping_fee, 
        refund_amount, 
        sweettracker_receipt_no,
        product_id
      ]
    );

    let nextItemStatus;
    if (claim_type === 'return') nextItemStatus = 'returning';
    else if (claim_type === 'exchange') nextItemStatus = 'exchanging';
    else nextItemStatus = 'refunding';

    const updatedItems = items.map(item => {
      if (item.id === product_id) {
        return { ...item, status: nextItemStatus };
      }
      return item;
    });

    const nextOrderStatus = deriveOrderStatusFromItems(updatedItems, order.status);

    await connection.query('UPDATE orders SET status = ?, order_items = ? WHERE id = ?', [nextOrderStatus, JSON.stringify(updatedItems), req.params.id]);

    await connection.commit();
    res.json({ 
      success: true, 
      message: '신청이 접수되었습니다.', 
      shipping_fee, 
      refund_amount,
      sweettracker_receipt_no,
      nextStatus: nextOrderStatus
    });
  } catch (error) {
    await connection.rollback();
    console.error('Claim Application Error:', error);
    res.status(500).json({ message: '서버 내부 오류' });
  } finally {
    connection.release();
  }
});

// 2-1. 관리자용 주문 취소 요청 승인/반려 API
app.put('/api/admin/orders/:id/approve-cancel', requireAdmin, async (req, res) => {
  const { action, product_id } = req.body; // 'approve' or 'reject', product_id (optional for single item)
  if (!action) return res.status(400).json({ message: '승인(approve) 또는 거절(reject) 처리가 지정되어야 합니다.' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [orderRows] = await connection.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (orderRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    const order = orderRows[0];
    let items = [];
    try {
      items = typeof order.order_items === 'string' ? JSON.parse(order.order_items) : order.order_items;
    } catch (e) {
      items = order.order_items || [];
    }

    let anyMatch = false;
    const updatedItems = [];

    for (const item of items) {
      const isTarget = !product_id || item.id === product_id;
      if (isTarget) {
        anyMatch = true;
        if (action === 'approve') {
          updatedItems.push({ ...item, status: 'cancelled' });
          await connection.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.id]);
        } else {
          updatedItems.push({ ...item, status: 'preparing' });
        }
      } else {
        updatedItems.push(item);
      }
    }

    if (!anyMatch) {
      await connection.rollback();
      return res.status(400).json({ message: '해당 취소요청 대상 상품을 찾을 수 없습니다.' });
    }

    const nextOrderStatus = deriveOrderStatusFromItems(updatedItems, order.status);

    await connection.query(
      'UPDATE orders SET status = ?, order_items = ? WHERE id = ?', 
      [nextOrderStatus, JSON.stringify(updatedItems), req.params.id]
    );

    await connection.commit();
    res.json({ 
      success: true, 
      message: action === 'approve' 
        ? '주문 취소 요청을 승인했습니다. 재고가 복구되었습니다.' 
        : '주문 취소 요청을 거절했습니다. 주문 상품이 배송준비중으로 환원됩니다.',
      nextStatus: nextOrderStatus
    });
  } catch (error) {
    await connection.rollback();
    console.error('Approve Cancel Error:', error);
    res.status(500).json({ message: '서버 내부 오류' });
  } finally {
    connection.release();
  }
});

// 3. 관리자용 반품/교환 신청 목록 조회
app.get('/api/admin/claims', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, u.name as user_name, u.email as user_email, o.total_amount, o.order_items
      FROM claims c
      JOIN users u ON c.user_id = u.id
      JOIN orders o ON c.order_id = o.id
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Fetch Claims Error:', error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

// 4. 관리자용 반품/교환 승인/거부 처리
app.put('/api/admin/claims/:id/status', requireAdmin, async (req, res) => {
  const { status, answer } = req.body; // status: 'approved', 'rejected', 'completed'
  if (!status) return res.status(400).json({ message: '상태 정보가 필요합니다.' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [claimRows] = await connection.query('SELECT * FROM claims WHERE id = ?', [req.params.id]);
    if (claimRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: '신청 내역을 찾을 수 없습니다.' });
    }

    const claim = claimRows[0];
    await connection.query('UPDATE claims SET status = ?, answer = ? WHERE id = ?', [status, answer || null, req.params.id]);

    const [orderRows] = await connection.query('SELECT * FROM orders WHERE id = ?', [claim.order_id]);
    if (orderRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: '매칭되는 주문을 찾을 수 없습니다.' });
    }

    const order = orderRows[0];
    let items = [];
    try {
      items = typeof order.order_items === 'string' ? JSON.parse(order.order_items) : order.order_items;
    } catch (e) {
      items = order.order_items || [];
    }

    let nextItemStatus = null;
    if (status === 'approved' || status === 'completed') {
      if (claim.claim_type === 'return') nextItemStatus = 'returned';
      else if (claim.claim_type === 'exchange') nextItemStatus = 'exchanged';
      else nextItemStatus = 'refunded';

      // 반품 또는 환불 승인 시 재고 복구 (해당 상품만)
      if (claim.claim_type === 'return' || claim.claim_type === 'refund') {
        const targetItem = items.find(item => item.id === claim.product_id);
        if (targetItem) {
          await connection.query('UPDATE products SET stock = stock + ? WHERE id = ?', [targetItem.quantity, targetItem.id]);
        }
      }
    } else if (status === 'rejected') {
      if (claim.claim_type === 'refund') nextItemStatus = 'confirmed';
      else nextItemStatus = 'delivered';
    }

    const updatedItems = items.map(item => {
      if (item.id === claim.product_id && nextItemStatus) {
        return { ...item, status: nextItemStatus };
      }
      return item;
    });

    // 대표 상태 계산
    const nextOrderStatus = nextItemStatus
      ? deriveOrderStatusFromItems(updatedItems, order.status)
      : order.status;

    await connection.query('UPDATE orders SET status = ?, order_items = ? WHERE id = ?', [nextOrderStatus, JSON.stringify(updatedItems), claim.order_id]);

    await connection.commit();
    res.json({ success: true, message: '반품/교환 요청 처리가 정상 완료되었습니다.', nextStatus: nextOrderStatus });
  } catch (error) {
    await connection.rollback();
    console.error('Process Claim Error:', error);
    res.status(500).json({ message: '서버 내부 오류' });
  } finally {
    connection.release();
  }
});

// 5. 관리자용 모의 정산 대시보드 API
app.get('/api/admin/settlements', requireAdmin, async (req, res) => {
  try {
    // 구매 확정된 주문 리스트 추출
    const [confirmedOrders] = await pool.query(`
      SELECT o.id, o.user_id, o.total_amount, o.confirmed_at, u.name as user_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.status = 'confirmed'
      ORDER BY o.confirmed_at DESC
    `);

    // 간단 통계 집계
    let totalSettled = 0; // 정산 완료 누적금
    let pendingSettled = 0; // 정산 예정금 (구매확정 후 1영업일 이전 가정)
    const settlements = confirmedOrders.map(order => {
      const confirmTime = new Date(order.confirmed_at);
      
      // 모의 정산 지급일정 산정: 구매확정일 + 1일 (주말 제외 등 모사)
      const settlementDate = new Date(confirmTime);
      settlementDate.setDate(settlementDate.getDate() + 1);
      
      const isSettled = settlementDate < new Date();
      const amount = order.total_amount;
      const fee = Math.round(amount * 0.033); // 모의 PG 수수료 3.3% 적용
      const payout = amount - fee;

      if (isSettled) {
        totalSettled += payout;
      } else {
        pendingSettled += payout;
      }

      return {
        order_id: order.id,
        user_name: order.user_name,
        total_amount: amount,
        fee,
        payout_amount: payout,
        confirmed_at: order.confirmed_at,
        settlement_date: settlementDate.toISOString().split('T')[0],
        status: isSettled ? '정산완료' : '정산예정'
      };
    });

    res.json({
      summary: {
        total_orders: confirmedOrders.length,
        total_sales: confirmedOrders.reduce((sum, o) => sum + o.total_amount, 0),
        total_settled: totalSettled,
        pending_settled: pendingSettled
      },
      settlements
    });
  } catch (error) {
    console.error('Settlement Fetch Error:', error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

// ==========================================
// Sweet Tracker Delivery Tracking API Proxy
// ==========================================
// Carrier code map: logen=06, cj=04, post=01
const CARRIER_CODE_MAP = { logen: '06', cj: '04', post: '01' };

// In-memory cache: { key -> { data, expireAt } }
const trackingCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const TRACKING_MONTHLY_LIMIT = Number(process.env.SWEETTRACKER_MONTHLY_LIMIT || 100);

const getTrackingMonthKey = () => new Date().toISOString().slice(0, 7);

app.get('/api/delivery/track', authenticateToken, async (req, res) => {
  const { tracking_number, carrier, order_id } = req.query;

  if (!tracking_number || !carrier) {
    return res.status(400).json({ message: '송장번호와 택배사 정보가 필요합니다.' });
  }

  const t_code = CARRIER_CODE_MAP[carrier] || '06'; // default logen
  const t_key = process.env.SWEETTRACKER_API_KEY;
  const cacheKey = `${req.user.id}:${order_id || 'unknown'}:${carrier}:${tracking_number}`;
  const expireAt = new Date(Date.now() + CACHE_TTL_MS);

  // Return cached result if fresh
  const cached = trackingCache.get(cacheKey);
  if (cached && cached.expireAt > Date.now()) {
    return res.json({ ...cached.data, fromCache: true, nextRefreshAt: new Date(cached.expireAt).toISOString() });
  }

  try {
    const [cachedRows] = await pool.query(
      'SELECT response_json, expire_at FROM delivery_tracking_cache WHERE cache_key = ? AND expire_at > NOW()',
      [cacheKey]
    );
    if (cachedRows.length > 0) {
      const cachedData = typeof cachedRows[0].response_json === 'string'
        ? JSON.parse(cachedRows[0].response_json)
        : cachedRows[0].response_json;
      const cachedExpireAt = new Date(cachedRows[0].expire_at).getTime();
      trackingCache.set(cacheKey, { data: cachedData, expireAt: cachedExpireAt });
      return res.json({ ...cachedData, fromCache: true, nextRefreshAt: new Date(cachedExpireAt).toISOString() });
    }
  } catch (cacheErr) {
    console.error('Delivery tracking cache lookup error:', cacheErr);
  }

  if (!t_key) {
    return res.status(503).json({
      message: '실제 배송조회를 위한 스마트택배 API 키가 설정되어 있지 않습니다. .env에 SWEETTRACKER_API_KEY를 추가해 주세요.'
    });
  }

  try {
    const monthKey = getTrackingMonthKey();
    const [usageRows] = await pool.query(
      'SELECT used_count FROM delivery_tracking_usage WHERE month_key = ?',
      [monthKey]
    );
    const usedCount = Number(usageRows[0]?.used_count || 0);

    if (usedCount >= TRACKING_MONTHLY_LIMIT) {
      return res.status(429).json({
        code: 'TRACKING_QUOTA_EXHAUSTED',
        message: '현재 배송조회가 어렵습니다.',
        tracking_number,
        carrier,
        monthlyLimit: TRACKING_MONTHLY_LIMIT,
        usedCount
      });
    }

    await pool.query(
      `INSERT INTO delivery_tracking_usage (month_key, used_count)
       VALUES (?, 1)
       ON DUPLICATE KEY UPDATE used_count = used_count + 1`,
      [monthKey]
    );

    const url = `https://info.sweettracker.co.kr/api/v1/trackingInfo?t_key=${t_key}&t_code=${t_code}&t_invoice=${tracking_number}`;
    const apiRes = await fetch(url);
    const data = await apiRes.json();

    if (data.code === 'IOS002') {
      return res.status(404).json({ message: '해당 운송장을 찾을 수 없습니다. 송장번호를 확인해주세요.' });
    }
    if (!apiRes.ok || data.status === false) {
      return res.status(502).json({ message: data.msg || '스마트택배 API 오류', detail: data });
    }

    // ① 배송완료 자동 감지: level=4이면 DB 자동 업데이트 (추가 API 소비 없음)
    const details = data.trackingDetails || [];
    const isDelivered = details.length > 0 && details[0].level === 4;
    if (isDelivered && order_id) {
      pool.query(
        "UPDATE orders SET status = 'delivered' WHERE id = ? AND status = 'shipping'",
        [order_id]
      ).then(([result]) => {
        if (result.affectedRows > 0) {
          console.log(`[AutoComplete] Order ${order_id} auto-marked as delivered via tracking query.`);
        }
      }).catch(err => console.error('[AutoComplete] DB update error:', err));
    }

    // Store in cache
    trackingCache.set(cacheKey, { data, expireAt: expireAt.getTime() });
    await pool.query(
      `INSERT INTO delivery_tracking_cache
       (cache_key, user_id, order_id, carrier, tracking_number, response_json, expire_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE response_json = VALUES(response_json), expire_at = VALUES(expire_at), updated_at = CURRENT_TIMESTAMP`,
      [cacheKey, req.user.id, order_id || null, carrier, tracking_number, JSON.stringify(data), expireAt]
    );

    res.json({ ...data, autoDetectedDelivered: isDelivered, fromCache: false, nextRefreshAt: expireAt.toISOString() });
  } catch (error) {
    console.error('Sweet Tracker API Error:', error);
    res.status(500).json({ message: '배송 조회 중 서버 오류가 발생했습니다.' });
  }
});


// ==========================================
// Reviews APIs
// ==========================================
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

app.post('/api/products/:id/reviews', authenticateToken, async (req, res) => {
  const { rating, comment } = req.body;
  const productId = req.params.id;

  if (!rating) return res.status(400).json({ message: '평점을 입력해 주세요.' });

  try {
    await pool.query(
      'INSERT INTO reviews (product_id, user_id, user_name, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [productId, req.user.id, req.user.name, rating, comment]
    );
    res.status(201).json({ message: '리뷰가 등록되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

// ==========================================
// Q&A APIs
// ==========================================
app.get('/api/products/:id/qna', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM qna WHERE product_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

app.post('/api/products/:id/qna', authenticateToken, async (req, res) => {
  const { title, content, is_secret } = req.body;
  const productId = req.params.id;

  if (!title || !content) return res.status(400).json({ message: '제목과 내용을 입력해 주세요.' });

  try {
    await pool.query(
      'INSERT INTO qna (product_id, user_id, user_name, title, content, is_secret) VALUES (?, ?, ?, ?, ?, ?)',
      [productId, req.user.id, req.user.name, title, content, is_secret ? 1 : 0]
    );
    res.status(201).json({ message: '상품 문의가 등록되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

app.put('/api/qna/:id/answer', requireAdmin, async (req, res) => {
  const { answer } = req.body;
  if (!answer) return res.status(400).json({ message: '답변 내용을 입력해 주세요.' });

  try {
    const [existing] = await pool.query('SELECT * FROM qna WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: '문의 글을 찾을 수 없습니다.' });

    await pool.query('UPDATE qna SET answer = ? WHERE id = ?', [answer, req.params.id]);
    res.json({ message: '문의 글에 답변이 등록되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

// ==========================================
// Admin Dashboard Stats API
// ==========================================
app.get('/api/admin/dashboard', requireAdmin, async (req, res) => {
  try {
    // 1. Total revenue & orders count
    const [orderStats] = await pool.query(`
      SELECT SUM(total_amount) as total_revenue, COUNT(*) as total_orders
      FROM orders
    `);

    // 2. Shipping status counters
    const [shippingStats] = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
    `);

    // 3. User stats
    const [userStats] = await pool.query("SELECT COUNT(*) as total_users FROM users WHERE role = 'user'");

    // 4. Visitors today
    const todayString = new Date().toISOString().split('T')[0];
    const [visitorStats] = await pool.query('SELECT visitors FROM analytics WHERE date = ?', [todayString]);
    const visitorsToday = visitorStats.length > 0 ? visitorStats[0].visitors : 0;

    // 5. 30 Days chart data
    const [chartData] = await pool.query(`
      SELECT date_format(date, '%Y-%m-%d') as date, revenue, visitors
      FROM analytics
      ORDER BY date ASC
      LIMIT 30
    `);

    // 6. Best selling products (Group by product_id inside order_items JSON)
    // For simplicity, retrieve last 5 orders items and extract popularity
    const [allOrders] = await pool.query('SELECT order_items FROM orders');
    const productSales = {};

    allOrders.forEach(ord => {
      const items = typeof ord.order_items === 'string' ? JSON.parse(ord.order_items) : ord.order_items;
      if (Array.isArray(items)) {
        items.forEach(item => {
          productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
        });
      }
    });

    const bestSellers = Object.keys(productSales).map(name => ({
      name,
      sales: productSales[name]
    })).sort((a, b) => b.sales - a.sales).slice(0, 5);

    res.json({
      revenue: orderStats[0].total_revenue || 0,
      orders: orderStats[0].total_orders || 0,
      users: userStats[0].total_users || 0,
      visitorsToday,
      shipping: shippingStats,
      chartData,
      bestSellers
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 내부 오류' });
  }
});

// Serve visitor counter tracking middleware
app.use(async (req, res, next) => {
  // Simple visitor counter increment for any landing/frontend loads
  if (req.path === '/' || req.path.includes('/api/products')) {
    const todayString = new Date().toISOString().split('T')[0];
    try {
      await pool.query(`
        INSERT INTO analytics (date, revenue, visitors) VALUES (?, 0, 1)
        ON DUPLICATE KEY UPDATE visitors = visitors + 1
      `, [todayString]);
    } catch (err) {
      console.error('Visitor analytics logging failed:', err);
    }
  }
  next();
});

// ==========================================
// Start Server
// ==========================================
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend Server running on port ${PORT}`);

    // ② 10일 경과 발송 주문 자동 배송완료 처리 (API 호출 없음)
    const AUTO_COMPLETE_INTERVAL_MS = 60 * 60 * 1000; // 매 1시간 체크
    const AUTO_COMPLETE_DAYS = 10;

    const runAutoComplete = async () => {
      try {
        const [result] = await pool.query(
          `UPDATE orders 
           SET status = 'delivered' 
           WHERE status = 'shipping' 
             AND tracking_number IS NOT NULL 
             AND created_at <= DATE_SUB(NOW(), INTERVAL ? DAY)`,
          [AUTO_COMPLETE_DAYS]
        );
        if (result.affectedRows > 0) {
          console.log(`[AutoComplete] ${result.affectedRows}건의 주문이 10일 경과로 자동 배송완료 처리되었습니다.`);
        }
      } catch (err) {
        console.error('[AutoComplete] 자동 완료 처리 오류:', err);
      }
    };

    // 서버 시작 시 즉시 1회 실행 후 주기적 반복
    runAutoComplete();
    setInterval(runAutoComplete, AUTO_COMPLETE_INTERVAL_MS);

    // 6. 사용자 프로필 수정 API
    app.put('/api/users/profile', authenticateToken, async (req, res) => {
      const { name, password, phone, address } = req.body;
      const userId = req.user.id;

      try {
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();

          // 1. 기존 유저 조회
          const [userRows] = await connection.query('SELECT * FROM users WHERE id = ?', [userId]);
          if (userRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
          }

          // 2. 정보 업데이트 쿼리 동적 생성
          let updateQuery = 'UPDATE users SET name = ?';
          let updateParams = [name || userRows[0].name];

          if (phone !== undefined) {
            const normalizedPhone = String(phone || '').replace(/\D/g, '');
            if (!/^01\d{8,9}$/.test(normalizedPhone)) {
              await connection.rollback();
              return res.status(400).json({ message: '휴대폰 번호를 올바르게 입력해 주세요. 예: 010-1234-5678' });
            }
            updateQuery += ', phone = ?';
            updateParams.push(normalizedPhone);
          }

          if (password && password.trim() !== '') {
            const passwordError = validatePasswordPolicy(password, {
              email: userRows[0].email,
              name: name || userRows[0].name
            });
            if (passwordError) {
              await connection.rollback();
              return res.status(400).json({ message: passwordError });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += ', password = ?';
            updateParams.push(hashedPassword);
          }

          if (address !== undefined) {
            updateQuery += ', address = ?';
            updateParams.push(address);
          }

          updateQuery += ' WHERE id = ?';
          updateParams.push(userId);

          await connection.query(updateQuery, updateParams);
          await connection.commit();

          // 3. 갱신된 회원 정보 반환
          const [updatedUser] = await pool.query('SELECT id, email, name, phone, role, address, created_at FROM users WHERE id = ?', [userId]);
          res.json({ success: true, message: '회원 정보가 수정되었습니다.', user: updatedUser[0] });
        } catch (err) {
          await connection.rollback();
          throw err;
        } finally {
          connection.release();
        }
      } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
      }
    });

    // 6-1. 비밀번호 확인 API
    app.post('/api/users/verify-password', authenticateToken, async (req, res) => {
      const { password } = req.body;
      const userId = req.user.id;

      if (!password) {
        return res.status(400).json({ message: '비밀번호를 입력해 주세요.' });
      }

      try {
        const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) {
          return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        const user = rows[0];
        
        // 간편 로그인 회원의 경우 password가 비어있으므로 검증 생략
        if (!user.password) {
          return res.json({ success: true, isSocial: true });
        }

        const passwordMatch = bcrypt.compareSync(password, user.password);
        if (!passwordMatch) {
          return res.status(400).json({ message: '비밀번호가 일치하지 않습니다.' });
        }

        res.json({ success: true });
      } catch (error) {
        console.error('Verify Password Error:', error);
        res.status(500).json({ message: '서버 내부 오류가 발생했습니다.' });
      }
    });

    // 6-2. 회원 탈퇴 API
    app.delete('/api/users/withdraw', authenticateToken, async (req, res) => {
      const userId = req.user.id;
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        // 1. 연관 클레임 삭제
        await connection.query(`
          DELETE FROM claims 
          WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)
        `, [userId]);

        // 2. 연관 주문 삭제
        await connection.query('DELETE FROM orders WHERE user_id = ?', [userId]);

        // 3. 연관 상품 문의(QnA) 삭제
        await connection.query('DELETE FROM qna WHERE user_id = ?', [userId]);

        // 4. 연관 상품 리뷰 삭제
        await connection.query('DELETE FROM reviews WHERE user_id = ?', [userId]);

        // 5. 최종 유저 삭제
        await connection.query('DELETE FROM users WHERE id = ?', [userId]);

        await connection.commit();
        res.json({ success: true, message: '회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.' });
      } catch (error) {
        await connection.rollback();
        console.error('Withdraw User Error:', error);
        res.status(500).json({ message: '회원 탈퇴 처리 중 오류가 발생했습니다.' });
      } finally {
        connection.release();
      }
    });

    // Serve built frontend (for external tunnel/production access)
    const distPath = path.join(__dirname, '..', 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      // SPA fallback: all non-API routes return index.html
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          res.sendFile(path.join(distPath, 'index.html'));
        }
      });
      console.log('Serving static frontend from dist/');
    }
  });
}).catch(err => {
  console.error('Failed to initialize server due to Database error.', err);
});
