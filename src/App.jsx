import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import BlockLoader from '@/components/ui/BlockLoader';
import DevAccountSwitcher from '@/components/dev/DevAccountSwitcher';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
    <Layout currentPageName={currentPageName}>{children}</Layout>
    : <>{children}</>;

const AuthenticatedApp = () => {
    const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

    // Show animated blocks loader while checking app public settings or auth
    if (isLoadingPublicSettings || isLoadingAuth) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-[#f7f7f8]">
                <BlockLoader size="lg" text="Loading RentFlex" />
            </div>
        );
    }

    // Handle authentication errors
    if (authError) {
        if (authError.type === 'user_not_registered') {
            return <UserNotRegisteredError />;
        } else if (authError.type === 'auth_required') {
            // Redirect to login automatically
            navigateToLogin();
            return null;
        }
    }

    // Render the main app
    return (
        <Routes>
            <Route path="/" element={
                <LayoutWrapper currentPageName={mainPageKey}>
                    <MainPage />
                </LayoutWrapper>
            } />
            {Object.entries(Pages).map(([path, Page]) => (
                <Route
                    key={path}
                    path={`/${path}`}
                    element={
                        <LayoutWrapper currentPageName={path}>
                            <Page />
                        </LayoutWrapper>
                    }
                />
            ))}
            <Route path="*" element={<PageNotFound />} />
        </Routes>
    );
};


function App() {
    return (
        <QueryClientProvider client={queryClientInstance}>
            <AuthProvider>
                <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <NavigationTracker />
                    <AuthenticatedApp />
                </Router>
                <Toaster />
            </AuthProvider>
        </QueryClientProvider>
    )
}

export default App
