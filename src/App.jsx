import React from 'react';
import { ShopProvider, useShop } from './context/ShopContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ChatWidget from './components/ChatWidget';
import Home from './pages/Home';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Register from './pages/Register';
import Checkout from './pages/Checkout';
import MyPage from './pages/MyPage';
import AdminDashboard from './pages/AdminDashboard';
import NaverCallback from './pages/NaverCallback';
import KakaoCallback from './pages/KakaoCallback';
import GoogleCallback from './pages/GoogleCallback';
import AdditionalInfo from './pages/AdditionalInfo';
import './App.css';

function MainLayout() {
  const { page, loading } = useShop();

  if (loading) {
    return (
      <div className="app-wrapper flex flex-col min-h-screen">
        <Header />
        <main className="main-content flex-grow">
          <div className="container py-12 text-center">
            <h3 className="font-bold text-dark text-lg mb-2">영테크 화면을 불러오는 중입니다.</h3>
            <p className="text-sm text-light">새로고침한 위치를 확인하고 있습니다.</p>
          </div>
        </main>
      </div>
    );
  }

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <Home />;
      case 'productList':
        return <ProductList />;
      case 'productDetail':
        return <ProductDetail />;
      case 'cart':
        return <Cart />;
      case 'login':
        return <Login />;
      case 'register':
        return <Register />;
      case 'checkout':
        return <Checkout />;
      case 'myPage':
        return <MyPage />;
      case 'admin':
        return <AdminDashboard />;
      case 'oauthCallbackNaver':
        return <NaverCallback />;
      case 'oauthCallbackKakao':
        return <KakaoCallback />;
      case 'oauthCallbackGoogle':
        return <GoogleCallback />;
      case 'additionalInfo':
        return <AdditionalInfo />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="app-wrapper flex flex-col min-h-screen">
      <Header />
      <main className="main-content flex-grow">
        {renderPage()}
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}

export default function App() {
  return (
    <ShopProvider>
      <MainLayout />
    </ShopProvider>
  );
}
