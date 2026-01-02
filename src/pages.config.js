import Welcome from './pages/Welcome';
import RoleSelection from './pages/RoleSelection';
import TermsAcceptance from './pages/TermsAcceptance';
import Onboarding from './pages/Onboarding';
import KYCVerification from './pages/KYCVerification';
import Discover from './pages/Discover';
import BookingDetails from './pages/BookingDetails';
import MyBookings from './pages/MyBookings';
import BookingView from './pages/BookingView';
import CompanionDashboard from './pages/CompanionDashboard';
import ManageAvailability from './pages/ManageAvailability';
import Wallet from './pages/Wallet';
import ChatList from './pages/ChatList';
import Profile from './pages/Profile';
import GroupEvents from './pages/GroupEvents';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Welcome": Welcome,
    "RoleSelection": RoleSelection,
    "TermsAcceptance": TermsAcceptance,
    "Onboarding": Onboarding,
    "KYCVerification": KYCVerification,
    "Discover": Discover,
    "BookingDetails": BookingDetails,
    "MyBookings": MyBookings,
    "BookingView": BookingView,
    "CompanionDashboard": CompanionDashboard,
    "ManageAvailability": ManageAvailability,
    "Wallet": Wallet,
    "ChatList": ChatList,
    "Profile": Profile,
    "GroupEvents": GroupEvents,
    "AdminDashboard": AdminDashboard,
    "AdminUsers": AdminUsers,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
    Layout: __Layout,
};