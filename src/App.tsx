import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import AnalyticsTracker from './components/AnalyticsTracker'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import AboutPage from './pages/AboutPage'
import FAQPage from './pages/FAQPage'
import PoliciesPage from './pages/PoliciesPage'
import TermsPage from './pages/TermsPage'
import NotFound from './pages/NotFound'
import AccountPage from './pages/AccountPage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <div className="app">
      <ScrollToTop />
      <AnalyticsTracker />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/productos" element={<Products />} />
          <Route path="/producto/:id" element={<ProductDetail />} />
          <Route path="/carrito" element={<CartPage />} />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute loadingMessage="Abriendo tu checkout…">
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route path="/cuenta" element={<AccountPage />} />
          <Route path="/nosotros" element={<AboutPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/politicas" element={<PoliciesPage />} />
          <Route path="/terminos" element={<TermsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
