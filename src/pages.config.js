import Welcome from './pages/Welcome';
import RoleSelection from './pages/RoleSelection';
import TermsAcceptance from './pages/TermsAcceptance';
import Onboarding from './pages/Onboarding';
import KYCVerification from './pages/KYCVerification';
import Discover from './pages/Discover';
import BookingDetails from './pages/BookingDetails';
import MyBookings from './pages/MyBookings';
import BookingView from './pages/BookingView';
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
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
    Layout: __Layout,
};