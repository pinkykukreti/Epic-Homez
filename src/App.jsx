import { lazy, Suspense, useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  useLocation,
} from "react-router-dom";
import { localPreview } from "./lib/api";
import { SiteProvider } from "./lib/context";
import Header from "./components/Header";
import Footer from "./components/Footer";
import EnquiryDialog from "./components/EnquiryForm";
import Home from "./pages/Home";
import Catalogue from "./pages/Catalogue";
import ProductDetails from "./pages/ProductDetails";
import { Story, Contact, Policy, NotFound } from "./pages/StaticPages";
import { Notice } from "./components/UI";
import "./App.css";
import "./catalogue.css";
import "./luxury.css";
const Admin = lazy(() => import("./pages/Admin"));
const AdminProducts = lazy(() =>
  import("./pages/AdminProducts").then((m) => ({ default: m.AdminProducts })),
);
const Overview = lazy(() =>
  import("./pages/AdminProducts").then((m) => ({ default: m.Overview })),
);
const AdminEnquiries = lazy(() => import("./pages/AdminEnquiries"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
function Layout() {
  return (
    <>
      <Header />
      <main id="main">
        {import.meta.env.DEV && localPreview && <p className="preview-note">Collection preview · For prices and availability, speak with our team.</p>}
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
function Content() {
  const [enquiry, setEnquiry] = useState(null);
  const { pathname } = useLocation();
  useEffect(() => {
    setEnquiry(null);
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <>
      <Suspense fallback={<Notice>Loading…</Notice>}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home onEnquire={setEnquiry} />} />
            <Route
              path="products"
              element={<Catalogue onEnquire={setEnquiry} />}
            />
            <Route
              path="collections/:category"
              element={<Catalogue onEnquire={setEnquiry} />}
            />
            <Route
              path="products/:slug"
              element={<ProductDetails onEnquire={setEnquiry} />}
            />
            <Route path="our-story" element={<Story />} />
            <Route path="contact" element={<Contact />} />
            <Route path="privacy" element={<Policy type="privacy" />} />
            <Route path="terms" element={<Policy type="terms" />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="admin" element={<Admin />}>
            <Route index element={<Overview />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="enquiries" element={<AdminEnquiries />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
      {enquiry && (
        <EnquiryDialog product={enquiry} onClose={() => setEnquiry(null)} />
      )}
    </>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <SiteProvider>
        <Content />
      </SiteProvider>
    </BrowserRouter>
  );
}
