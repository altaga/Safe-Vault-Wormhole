// Basic Imports
import React from 'react';
import {blockchains} from './constants';
import {ethers} from 'ethers';

const ContextModule = React.createContext();

// Context Provider Component

class ContextProvider extends React.Component {
  // define all the values you want to use in the context
  constructor(props) {
    super(props);
    this.state = {
      provider: new ethers.providers.JsonRpcProvider(blockchains[0].rpc),
      value: {
        // Main Wallet
        publicKey: null,
        balances: blockchains.map(x => x.tokens.map(() => 0)),
        activeTokens: blockchains.map(x => x.tokens.map(() => true)),
        // Savings
        publicKeySavings: null,
        balancesSavings: blockchains.map(x => x.tokens.map(() => 0)),
        activeTokensSavings: blockchains.map(x => x.tokens.map(() => true)),
        // State Flag of Savings
        savingsActive: false,
        periodSelected: 1,
        protocolSelected: 1,
        savingsDate: 0,
        percentage: 0,
        // Card
        publicKeyCard: null,
        balancesCard: blockchains.map(x => x.tokens.map(() => 0)),
        activeTokensCard: blockchains.map(x => x.tokens.map(() => true)),
        // Utils
        usdConversion: blockchains.map(x => x.tokens.map(() => 1)),
        // Transaction Active
        isTransactionActive: false, // false
        transactionData: {
          walletSelector: 0,
          fromChainSelector: 0,
          command: 'transfer',
          label: '',
          to: '',
          amount: '0.0',
          tokenSymbol: blockchains[0].tokens[0].symbol,
          maxFlag: false,
          withSavings: false,
        },
      },
    };
  }

  setValue = (value, then = () => {}) => {
    this.setState(
      {
        value: {
          ...this.state.value,
          ...value,
        },
      },
      () => then(),
    );
  };

  setProvider = provider => {
    this.setState({
      provider,
    });
  };

  render() {
    const {children} = this.props;
    const {value, provider} = this.state;
    // Fill this object with the methods you want to pass down to the context
    const {setValue, setProvider} = this;

    return (
      <ContextModule.Provider
        // Provide all the methods and values defined above
        value={{
          provider,
          value,
          setValue,
          setProvider,
        }}>
        {children}
      </ContextModule.Provider>
    );
  }
}

// Dont Change anything below this line

export {ContextProvider};
export const ContextConsumer = ContextModule.Consumer;
export default ContextModule;
