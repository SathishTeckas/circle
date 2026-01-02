import Welcome from './pages/Welcome';
import RoleSelection from './pages/RoleSelection';
import TermsAcceptance from './pages/TermsAcceptance';
import Onboarding from './pages/Onboarding';
import KYCVerification from './pages/KYCVerification';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Welcome": Welcome,
    "RoleSelection": RoleSelection,
    "TermsAcceptance": TermsAcceptance,
    "Onboarding": Onboarding,
    "KYCVerification": KYCVerification,
}

export const pagesConfig = {
    mainPage: "Welcome",
    Pages: PAGES,
    Layout: __Layout,
};