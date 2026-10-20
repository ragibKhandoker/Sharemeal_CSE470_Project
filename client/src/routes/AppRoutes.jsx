import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ShareMealLoading from '../components/common/ShareMealLoading';

// Public Pages
import Home from '../pages/public/Home';
import About from '../pages/public/About';
import HowItWorks from '../pages/public/HowItWorks';
import DonateFood from '../pages/public/DonateFood';
import FindFood from '../pages/public/FindFood';
import NGOPartnership from '../pages/public/NGOPartnership';
import Contact from '../pages/public/Contact';
import FAQ from '../pages/public/FAQ';
import HelpCentre from '../pages/public/HelpCentre';
import SafetyProtocols from '../pages/public/SafetyProtocols';
import PrivacyPolicy from '../pages/public/PrivacyPolicy';
import TermsOfService from '../pages/public/TermsOfService';
import Login from '../pages/public/Login';
import Signup from '../pages/public/Signup';
import NgoLogin from '../pages/public/NgoLogin';
import AdminLogin from '../pages/public/AdminLogin';
import Stories from '../pages/public/Stories';
import StoryDetail from '../pages/public/StoryDetail';
import ResetPassword from '../pages/public/ResetPassword';

// Donor Pages
import DonorDashboard from '../pages/donor/Dashboard';
import PostFood from '../pages/donor/PostFood';
import MyDonations from '../pages/donor/MyDonations';
import DonationDetail from '../pages/donor/DonationDetail';
import FoodJourney from '../pages/donor/FoodJourney';
import DonorRatings from '../pages/donor/Ratings';
import DonorHistory from '../pages/donor/History';
import DonorNotifications from '../pages/donor/Notifications';
import DonorProfile from '../pages/donor/Profile';

// NGO Pages
import NgoDashboard from '../pages/ngo/Dashboard';
import IncomingDonations from '../pages/ngo/IncomingDonations';
import CollectionRequests from '../pages/ngo/CollectionRequests';
import PickupPoints from '../pages/ngo/PickupPoints';
import ServingLog from '../pages/ngo/ServingLog';
import ReceiverRequests from '../pages/ngo/ReceiverRequests';
import NgoReports from '../pages/ngo/Reports';
import NgoProfile from '../pages/ngo/Profile';
import BlogManagement from '../pages/ngo/BlogManagement';
import NgoPayments from '../pages/ngo/Payments';

// Receiver Pages
import ReceiverDashboard from '../pages/receiver/Dashboard';
import ReceiverFindFood from '../pages/receiver/FindFood';
import CartWishlist from '../pages/receiver/CartWishlist';
import ReceiverWallet from '../pages/receiver/Wallet';
import MyRequests from '../pages/receiver/MyRequests';
import RequestDetail from '../pages/receiver/RequestDetail';
import ReceiverHistory from '../pages/receiver/History';
import ReceiverRatings from '../pages/receiver/Ratings';
import ReceiverProfile from '../pages/receiver/Profile';
import ReceiverNotifications from '../pages/receiver/Notifications';

// Admin Pages
import AdminDashboard from '../pages/admin/Dashboard';
import AdminUsers from '../pages/admin/Users';
import FoodPostThreads from '../pages/admin/FoodPostThreads';
import NGOVerificationQueue from '../pages/admin/NGOVerificationQueue';
import AdminReports from '../pages/admin/Reports';
import AdminAnalytics from '../pages/admin/Analytics';
import BotAlerts from '../pages/admin/BotAlerts';
import AdminSettings from '../pages/admin/Settings';

/**
 * Role-Based Protected Route Guard Component
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <ShareMealLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/stories" element={<Stories />} />
      <Route path="/stories/:id" element={<StoryDetail />} />
      <Route path="/story/:id" element={<StoryDetail />} />
      <Route path="/story" element={<StoryDetail />} />
      <Route path="/about" element={<About />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/donate" element={<DonateFood />} />
      <Route path="/find-food" element={<FindFood />} />
      <Route path="/ngo-partnership" element={<NGOPartnership />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/help" element={<HelpCentre />} />
      <Route path="/help-centre" element={<HelpCentre />} />
      <Route path="/safety" element={<SafetyProtocols />} />
      <Route path="/safety-protocols" element={<SafetyProtocols />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/ngo/login" element={<NgoLogin />} />
      <Route path="/ngo-portal" element={<NgoLogin />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/super-admin/login" element={<AdminLogin />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Donor Protected Routes */}
      <Route path="/donor/dashboard" element={<ProtectedRoute allowedRoles={['donor']}><DonorDashboard /></ProtectedRoute>} />
      <Route path="/donor/post-food" element={<ProtectedRoute allowedRoles={['donor']}><PostFood /></ProtectedRoute>} />
      <Route path="/donor/my-donations" element={<ProtectedRoute allowedRoles={['donor']}><MyDonations /></ProtectedRoute>} />
      <Route path="/donor/donations/:id" element={<ProtectedRoute allowedRoles={['donor']}><DonationDetail /></ProtectedRoute>} />
      <Route path="/donor/food-journey" element={<ProtectedRoute allowedRoles={['donor']}><FoodJourney /></ProtectedRoute>} />
      <Route path="/donor/journey" element={<ProtectedRoute allowedRoles={['donor']}><FoodJourney /></ProtectedRoute>} />
      <Route path="/donor/ratings" element={<ProtectedRoute allowedRoles={['donor']}><DonorRatings /></ProtectedRoute>} />
      <Route path="/donor/history" element={<ProtectedRoute allowedRoles={['donor']}><DonorHistory /></ProtectedRoute>} />
      <Route path="/donor/notifications" element={<ProtectedRoute allowedRoles={['donor']}><DonorNotifications /></ProtectedRoute>} />
      <Route path="/donor/profile" element={<ProtectedRoute allowedRoles={['donor']}><DonorProfile /></ProtectedRoute>} />

      {/* NGO Protected Routes */}
      <Route path="/ngo/dashboard" element={<ProtectedRoute allowedRoles={['ngo']}><NgoDashboard /></ProtectedRoute>} />
      <Route path="/ngo/incoming" element={<ProtectedRoute allowedRoles={['ngo']}><IncomingDonations /></ProtectedRoute>} />
      <Route path="/ngo/collections" element={<ProtectedRoute allowedRoles={['ngo']}><CollectionRequests /></ProtectedRoute>} />
      <Route path="/ngo/pickup-points" element={<ProtectedRoute allowedRoles={['ngo']}><PickupPoints /></ProtectedRoute>} />
      <Route path="/ngo/serving-log" element={<ProtectedRoute allowedRoles={['ngo']}><ServingLog /></ProtectedRoute>} />
      <Route path="/ngo/requests" element={<ProtectedRoute allowedRoles={['ngo']}><ReceiverRequests /></ProtectedRoute>} />
      <Route path="/ngo/receiver-requests" element={<ProtectedRoute allowedRoles={['ngo']}><ReceiverRequests /></ProtectedRoute>} />
      <Route path="/ngo/staff-requests" element={<ProtectedRoute allowedRoles={['ngo']}><ReceiverRequests /></ProtectedRoute>} />
      <Route path="/ngo/payments" element={<ProtectedRoute allowedRoles={['ngo']}><NgoPayments /></ProtectedRoute>} />
      <Route path="/ngo/reports" element={<ProtectedRoute allowedRoles={['ngo']}><NgoReports /></ProtectedRoute>} />
      <Route path="/ngo/blogs" element={<ProtectedRoute allowedRoles={['ngo', 'admin', 'super_admin']}><BlogManagement /></ProtectedRoute>} />
      <Route path="/ngo/profile" element={<ProtectedRoute allowedRoles={['ngo']}><NgoProfile /></ProtectedRoute>} />

      {/* Receiver Protected Routes */}
      <Route path="/receiver/dashboard" element={<ProtectedRoute allowedRoles={['receiver']}><ReceiverDashboard /></ProtectedRoute>} />
      <Route path="/receiver/find-food" element={<ProtectedRoute allowedRoles={['receiver']}><ReceiverFindFood /></ProtectedRoute>} />
      <Route path="/receiver/cart" element={<ProtectedRoute allowedRoles={['receiver']}><CartWishlist /></ProtectedRoute>} />
      <Route path="/receiver/wallet" element={<ProtectedRoute allowedRoles={['receiver']}><ReceiverWallet /></ProtectedRoute>} />
      <Route path="/receiver/my-requests" element={<ProtectedRoute allowedRoles={['receiver']}><MyRequests /></ProtectedRoute>} />
      <Route path="/receiver/requests/:id" element={<ProtectedRoute allowedRoles={['receiver']}><RequestDetail /></ProtectedRoute>} />
      <Route path="/receiver/history" element={<ProtectedRoute allowedRoles={['receiver']}><ReceiverHistory /></ProtectedRoute>} />
      <Route path="/receiver/ratings" element={<ProtectedRoute allowedRoles={['receiver']}><ReceiverRatings /></ProtectedRoute>} />
      <Route path="/receiver/profile" element={<ProtectedRoute allowedRoles={['receiver']}><ReceiverProfile /></ProtectedRoute>} />
      <Route path="/receiver/notifications" element={<ProtectedRoute allowedRoles={['receiver']}><ReceiverNotifications /></ProtectedRoute>} />

      {/* Admin Protected Routes */}
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/food-threads" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><FoodPostThreads /></ProtectedRoute>} />
      <Route path="/admin/threads" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><FoodPostThreads /></ProtectedRoute>} />
      <Route path="/admin/ngo-queue" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><NGOVerificationQueue /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/food-reports" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AdminAnalytics /></ProtectedRoute>} />
      <Route path="/admin/bot-alerts" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><BotAlerts /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AdminSettings /></ProtectedRoute>} />

      {/* Fallback Catch-all Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
