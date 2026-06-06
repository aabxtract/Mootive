import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import PhoneFrame from './components/PhoneFrame';

import LandingScreen from './screens/LandingScreen';
import SignupScreen from './screens/SignupScreen';
import ConfirmSignupScreen from './screens/ConfirmSignupScreen';
import LoginScreen from './screens/LoginScreen';
import RoleSetupScreen from './screens/RoleSetupScreen';
import DriverProfileSetupScreen from './screens/DriverProfileSetupScreen';

import SellerHomeScreen from './screens/SellerHomeScreen';
import CreateDeliveryScreen from './screens/CreateDeliveryScreen';
import FindingDriversScreen from './screens/FindingDriversScreen';
import SenderTrackingScreen from './screens/SenderTrackingScreen';
import IncomingScreen from './screens/IncomingScreen';
import ReceiverConfirmScreen from './screens/ReceiverConfirmScreen';
import CompletedScreen from './screens/CompletedScreen';
import ReportIssueScreen from './screens/ReportIssueScreen';

import DriverHomeScreen from './screens/DriverHomeScreen';
import AvailableJobsScreen from './screens/AvailableJobsScreen';
import JobDetailScreen from './screens/JobDetailScreen';
import DriverRouteScreen from './screens/DriverRouteScreen';
import DriverAcceptedJobsScreen from './screens/DriverAcceptedJobsScreen';

import { Loader2 } from 'lucide-react';

function Body() {
  const { view, VIEWS, bootLoading } = useApp();

  if (bootLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
        <Loader2 className="animate-spin" size={20} /><p className="text-xs">Starting…</p>
      </div>
    );
  }

  switch (view) {
    case VIEWS.landing:              return <LandingScreen />;
    case VIEWS.signup:               return <SignupScreen />;
    case VIEWS.confirm:              return <ConfirmSignupScreen />;
    case VIEWS.login:                return <LoginScreen />;
    case VIEWS.roleSetup:            return <RoleSetupScreen />;
    case VIEWS.driverProfileSetup:   return <DriverProfileSetupScreen />;

    case VIEWS.sellerHome:           return <SellerHomeScreen />;
    case VIEWS.createDelivery:       return <CreateDeliveryScreen />;
    case VIEWS.findingDrivers:       return <FindingDriversScreen />;
    case VIEWS.senderTracking:       return <SenderTrackingScreen />;
    case VIEWS.incoming:             return <IncomingScreen />;
    case VIEWS.receiverConfirm:      return <ReceiverConfirmScreen />;
    case VIEWS.completed:            return <CompletedScreen />;
    case VIEWS.reportIssue:          return <ReportIssueScreen />;

    case VIEWS.driverHome:           return <DriverHomeScreen />;
    case VIEWS.availableJobs:        return <AvailableJobsScreen />;
    case VIEWS.jobDetail:            return <JobDetailScreen />;
    case VIEWS.driverRoute:          return <DriverRouteScreen />;
    case VIEWS.completedJobs:        return <DriverAcceptedJobsScreen />;

    default:                         return <LandingScreen />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 text-slate-200 relative overflow-hidden select-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
        <PhoneFrame><Body /></PhoneFrame>
      </div>
    </AppProvider>
  );
}
