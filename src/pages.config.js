import AdminDashboard from './pages/AdminDashboard';
import AdminDisputes from './pages/AdminDisputes';
import AdminGroups from './pages/AdminGroups';
import AdminManagement from './pages/AdminManagement';
import AdminPayouts from './pages/AdminPayouts';
import AdminSettings from './pages/AdminSettings';
import AdminUsers from './pages/AdminUsers';
import AdminVenues from './pages/AdminVenues';
import BookingDetails from './pages/BookingDetails';
import BookingView from './pages/BookingView';
import CalendarView from './pages/CalendarView';
import ChatList from './pages/ChatList';
import CompanionBookings from './pages/CompanionBookings';
import CompanionDashboard from './pages/CompanionDashboard';
import Discover from './pages/Discover';
import GroupEvents from './pages/GroupEvents';
import HelpSupport from './pages/HelpSupport';
import KYCVerification from './pages/KYCVerification';
import LeaveReview from './pages/LeaveReview';
import ManageAvailability from './pages/ManageAvailability';
import MyBookings from './pages/MyBookings';
import Notifications from './pages/Notifications';
import Onboarding from './pages/Onboarding';
import PrivacySafety from './pages/PrivacySafety';
import RaiseDispute from './pages/RaiseDispute';
import RoleSelection from './pages/RoleSelection';
import TermsAcceptance from './pages/TermsAcceptance';
import Wallet from './pages/Wallet';
import Welcome from './pages/Welcome';
import ChatView from './pages/ChatView';
import UserProfile from './pages/UserProfile';
import EditProfile from './pages/EditProfile';
import Profile from './pages/Profile';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "AdminDisputes": AdminDisputes,
    "AdminGroups": AdminGroups,
    "AdminManagement": AdminManagement,
    "AdminPayouts": AdminPayouts,
    "AdminSettings": AdminSettings,
    "AdminUsers": AdminUsers,
    "AdminVenues": AdminVenues,
    "BookingDetails": BookingDetails,
    "BookingView": BookingView,
    "CalendarView": CalendarView,
    "ChatList": ChatList,
    "CompanionBookings": CompanionBookings,
    "CompanionDashboard": CompanionDashboard,
    "Discover": Discover,
    "GroupEvents": GroupEvents,
    "HelpSupport": HelpSupport,
    "KYCVerification": KYCVerification,
    "LeaveReview": LeaveReview,
    "ManageAvailability": ManageAvailability,
    "MyBookings": MyBookings,
    "Notifications": Notifications,
    "Onboarding": Onboarding,
    "PrivacySafety": PrivacySafety,
    "RaiseDispute": RaiseDispute,
    "RoleSelection": RoleSelection,
    "TermsAcceptance": TermsAcceptance,
    "Wallet": Wallet,
    "Welcome": Welcome,
    "ChatView": ChatView,
    "UserProfile": UserProfile,
    "EditProfile": EditProfile,
    "Profile": Profile,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
    Layout: __Layout,
};