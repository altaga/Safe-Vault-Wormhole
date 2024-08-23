import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { StatusBar } from 'react-native';
import DepositWallet from './screens/depositWallet/depositWallet';
//import Lock from './screens/lock/lock';
import {
  Web3Modal
} from '@web3modal/ethers5-react-native';
import Main from './screens/main/main';
import PaymentWallet from './screens/paymentWallet/paymentWallet';
import SendWallet from './screens/sendWallet/sendWallet';
import Setup from './screens/setup/setup';
import SplashLoading from './screens/splashLoading/splashLoading';
import AppStateListener from './utils/appStateListener';
import { ContextProvider } from './utils/contextModule';
import TransactionsModal from './utils/transactionsModal';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <ContextProvider>
      <NavigationContainer>
        <AppStateListener />
        <Web3Modal />
        <StatusBar barStyle="light-content" />
        <TransactionsModal />
        <Stack.Navigator
          initialRouteName="SplashLoading"
          screenOptions={{
            headerShown: false,
          }}>
          <Stack.Screen name="SplashLoading" component={SplashLoading} />
          {
            // Splash
          }
          <Stack.Screen name="Setup" component={Setup} />
          {
            // Lock
            //<Stack.Screen name="Lock" component={Lock} />
          }

          {
            // Main
            <Stack.Screen name="Main" component={Main} />
          }
          {
            // Wallet Screens
          }
          <Stack.Screen name="SendWallet" component={SendWallet} />
          <Stack.Screen name="PaymentWallet" component={PaymentWallet} />
          <Stack.Screen name="DepositWallet" component={DepositWallet} />
        </Stack.Navigator>
      </NavigationContainer>
    </ContextProvider>
  );
}
