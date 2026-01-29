/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminCampaignReferrals from './pages/AdminCampaignReferrals';
import AdminCities from './pages/AdminCities';
import AdminCreateCampaign from './pages/AdminCreateCampaign';
import AdminDashboard from './pages/AdminDashboard';
import AdminDisputes from './pages/AdminDisputes';
import AdminErrors from './pages/AdminErrors';
import AdminFeedbackView from './pages/AdminFeedbackView';
import AdminFlaggedReviews from './pages/AdminFlaggedReviews';
import AdminGroups from './pages/AdminGroups';
import AdminGroupsDashboard from './pages/AdminGroupsDashboard';
import AdminManagement from './pages/AdminManagement';
import AdminPayouts from './pages/AdminPayouts';
import AdminSettings from './pages/AdminSettings';
import AdminUsers from './pages/AdminUsers';
import AdminVenues from './pages/AdminVenues';
import BookingDetails from './pages/BookingDetails';
import BookingView from './pages/BookingView';
import CalendarView from './pages/CalendarView';
import ChatList from './pages/ChatList';
import ChatView from './pages/ChatView';
import CompanionBookings from './pages/CompanionBookings';
import CompanionDashboard from './pages/CompanionDashboard';
import Discover from './pages/Discover';
import EditProfile from './pages/EditProfile';
import EventAnalytics from './pages/EventAnalytics';
import EventFeedback from './pages/EventFeedback';
import GroupEvents from './pages/GroupEvents';
import HelpSupport from './pages/HelpSupport';
import KYCVerification from './pages/KYCVerification';
import LeaveReview from './pages/LeaveReview';
import ManageAvailability from './pages/ManageAvailability';
import MyBookings from './pages/MyBookings';
import MyDisputes from './pages/MyDisputes';
import Notifications from './pages/Notifications';
import Onboarding from './pages/Onboarding';
import PrivacySafety from './pages/PrivacySafety';
import Profile from './pages/Profile';
import RaiseDispute from './pages/RaiseDispute';
import ReferralAnalytics from './pages/ReferralAnalytics';
import Referrals from './pages/Referrals';
import RoleSelection from './pages/RoleSelection';
import TermsAcceptance from './pages/TermsAcceptance';
import UserProfile from './pages/UserProfile';
import Wallet from './pages/Wallet';
import Welcome from './pages/Welcome';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminCampaignReferrals": AdminCampaignReferrals,
    "AdminCities": AdminCities,
    "AdminCreateCampaign": AdminCreateCampaign,
    "AdminDashboard": AdminDashboard,
    "AdminDisputes": AdminDisputes,
    "AdminErrors": AdminErrors,
    "AdminFeedbackView": AdminFeedbackView,
    "AdminFlaggedReviews": AdminFlaggedReviews,
    "AdminGroups": AdminGroups,
    "AdminGroupsDashboard": AdminGroupsDashboard,
    "AdminManagement": AdminManagement,
    "AdminPayouts": AdminPayouts,
    "AdminSettings": AdminSettings,
    "AdminUsers": AdminUsers,
    "AdminVenues": AdminVenues,
    "BookingDetails": BookingDetails,
    "BookingView": BookingView,
    "CalendarView": CalendarView,
    "ChatList": ChatList,
    "ChatView": ChatView,
    "CompanionBookings": CompanionBookings,
    "CompanionDashboard": CompanionDashboard,
    "Discover": Discover,
    "EditProfile": EditProfile,
    "EventAnalytics": EventAnalytics,
    "EventFeedback": EventFeedback,
    "GroupEvents": GroupEvents,
    "HelpSupport": HelpSupport,
    "KYCVerification": KYCVerification,
    "LeaveReview": LeaveReview,
    "ManageAvailability": ManageAvailability,
    "MyBookings": MyBookings,
    "MyDisputes": MyDisputes,
    "Notifications": Notifications,
    "Onboarding": Onboarding,
    "PrivacySafety": PrivacySafety,
    "Profile": Profile,
    "RaiseDispute": RaiseDispute,
    "ReferralAnalytics": ReferralAnalytics,
    "Referrals": Referrals,
    "RoleSelection": RoleSelection,
    "TermsAcceptance": TermsAcceptance,
    "UserProfile": UserProfile,
    "Wallet": Wallet,
    "Welcome": Welcome,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
    Layout: __Layout,
};