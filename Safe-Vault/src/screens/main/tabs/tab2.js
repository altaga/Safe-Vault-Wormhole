import Slider from '@react-native-community/slider';
import {ethers} from 'ethers';
import React, {Component, Fragment} from 'react';
import {
  Dimensions,
  Keyboard,
  NativeEventEmitter,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import {abiBatchTokenBalances} from '../../../contracts/batchTokenBalances';
import GlobalStyles, {mainColor} from '../../../styles/styles';
import {blockchains, refreshRate} from '../../../utils/constants';
import ContextModule from '../../../utils/contextModule';
import {
  arraySum,
  epsilonRound,
  formatDate,
  getAsyncStorageValue,
  setAsyncStorageValue,
  setEncryptedStorageValue,
} from '../../../utils/utils';

const periodsAvailable = [
  {
    label: 'Daily',
    value: 1,
    periodValue: 86400,
  },
  {
    label: 'Weekly',
    value: 2,
    periodValue: 604800,
  },
  {
    label: 'Monthly',
    value: 3,
    periodValue: 2629800,
  },
  {
    label: 'Yearly',
    value: 4,
    periodValue: 31557600,
  },
];

const protocolsAvailable = [
  {
    label: 'Balanced',
    value: 1,
  },
  {
    label: 'Percentage',
    value: 2,
  },
];

const baseTab2State = {
  refreshing: false,
  loading: false,
};

export default class Tab2 extends Component {
  constructor(props) {
    super(props);
    this.state = baseTab2State;
    this.provider = blockchains.map(
      x => new ethers.providers.JsonRpcProvider(x.rpc),
    );
    this.EventEmitter = new NativeEventEmitter();
  }

  static contextType = ContextModule;

  async getSavingsDate() {
    try {
      const savingsDate = await getAsyncStorageValue('savingsDate');
      if (savingsDate === null) throw 'Set First Date';
      return savingsDate;
    } catch (err) {
      await setAsyncStorageValue({savingsDate: 0});
      return 0;
    }
  }

  async getLastRefreshSavings() {
    try {
      const lastRefreshSavings = await getAsyncStorageValue(
        'lastRefreshSavings',
      );
      if (lastRefreshSavings === null) throw 'Set First Date';
      return lastRefreshSavings;
    } catch (err) {
      await setAsyncStorageValue({lastRefreshSavings: 0});
      return 0;
    }
  }

  async componentDidMount() {
    if (this.context.value.publicKeySavings) {
      this.EventEmitter.addListener('updateBalances', async () => {
        await this.refresh();
        Keyboard.dismiss();
      });
      const refreshCheck = Date.now();
      const lastRefresh = await this.getLastRefreshSavings();
      if (refreshCheck - lastRefresh >= refreshRate) {
        // 2.5 minutes
        console.log('Refreshing...');
        await setAsyncStorageValue({lastRefreshSavings: Date.now()});
        this.refresh();
      } else {
        console.log(
          `Next refresh Available: ${Math.round(
            (refreshRate - (refreshCheck - lastRefresh)) / 1000,
          )} Seconds`,
        );
      }
    }
  }

  async componentWillUnmount() {
    this.EventEmitter.removeAllListeners('updateBalances');
  }

  async createMnemonic() {
    const wallet = ethers.Wallet.createRandom();
    const mnemonic = wallet.mnemonic.phrase;
    const publicKey = wallet.address;
    const privateKey = wallet.privateKey;
    return {mnemonic, publicKey, privateKey};
  }

  async createAccount() {
    await this.setStateAsync({
      loading: true,
    });
    setTimeout(async () => {
      const {mnemonic, privateKey, publicKey} = await this.createMnemonic();
      await setEncryptedStorageValue({
        privateKeySavings: privateKey,
        mnemonicSavings: mnemonic,
      });
      await setAsyncStorageValue({
        publicKeySavings: publicKey,
      });
      this.context.setValue({
        publicKeySavings: publicKey,
      });
      await this.setStateAsync({loading: false});
    }, 100); // Delay for heavy load function
  }

  async refresh() {
    await this.setStateAsync({refreshing: true});
    await this.getSavingsBalance();
    await this.setStateAsync({refreshing: false});
  }

  async getBatchBalances() {
    const {publicKeySavings} = this.context.value;
    const tokensArrays = blockchains
      .map(x =>
        x.tokens.filter(
          token =>
            token.address !== '0x0000000000000000000000000000000000000000',
        ),
      )
      .map(x => x.map(y => y.address));
    const batchBalancesContracts = blockchains.map(
      (x, i) =>
        new ethers.Contract(
          x.batchBalancesAddress,
          abiBatchTokenBalances,
          this.provider[i],
        ),
    );
    const nativeBalances = await Promise.all(
      this.provider.map(
        x => x.getBalance(publicKeySavings) ?? ethers.BigNumber.from(0),
      ),
    );
    const tokenBalances = await Promise.all(
      batchBalancesContracts.map(
        (x, i) =>
          x.batchBalanceOf(publicKeySavings, tokensArrays[i]) ??
          ethers.BigNumber.from(0),
      ),
    );
    let balancesMerge = [];
    nativeBalances.forEach((x, i) =>
      balancesMerge.push([x, ...tokenBalances[i]]),
    );
    const balances = blockchains.map((x, i) =>
      x.tokens.map((y, j) => {
        return ethers.utils.formatUnits(balancesMerge[i][j], y.decimals);
      }),
    );
    console.log(balances);
    return balances;
  }

  async getSavingsBalance() {
    const balancesSavings = await this.getBatchBalances();
    await setAsyncStorageValue({balancesSavings});
    this.context.setValue({balancesSavings});
  }

  // Period
  async changePeriod() {
    const savingsDate =
      Date.now() +
      periodsAvailable[this.context.value.periodSelected - 1].periodValue *
        1000;
    await setAsyncStorageValue({savingsDate});
    this.context.setValue({savingsDate});
  }

  // Utils
  async setStateAsync(value) {
    return new Promise(resolve => {
      this.setState(
        {
          ...value,
        },
        () => resolve(),
      );
    });
  }

  render() {
    return (
      <View
        style={{
          width: Dimensions.get('window').width,
          justifyContent: 'space-evenly',
          alignItems: 'center',
          height: '100%',
        }}>
        <ScrollView
          refreshControl={
            <RefreshControl
              progressBackgroundColor={mainColor}
              refreshing={this.state.refreshing}
              onRefresh={async () => {
                await setAsyncStorageValue({
                  lastRefreshSavings: Date.now().toString(),
                });
                await this.refresh();
              }}
            />
          }
          style={{width: '100%', height: '100%'}}
          contentContainerStyle={[
            {
              height: '100%',
              width: '100%',
              alignItems: 'center',
            },
          ]}>
          {this.context.value.publicKeySavings ? (
            <Fragment>
              <View
                style={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingVertical: 20,
                  width: '90%',
                }}>
                <Text style={[GlobalStyles.titleSaves]}>
                  Savings Account Balance{' '}
                </Text>
                <Text
                  style={{
                    fontSize: 38,
                    color: 'white',
                    marginTop: 10,
                  }}>
                  {`$ ${epsilonRound(
                    arraySum(
                      this.context.value.balancesSavings
                        .flat()
                        .map((x, i) => x * this.context.value.usdConversion[i]),
                    ),
                    2,
                  )} USD`}
                </Text>
              </View>
              <View
                style={{
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  width: '90%',
                }}>
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignContent: 'center',
                    width: '100%',
                    borderBottomWidth: 2,
                    borderTopWidth: 2,
                    paddingBottom: 20,
                    paddingTop: 20,
                    borderColor: mainColor,
                  }}>
                  <Text style={[GlobalStyles.titleSaves]}>
                    Activate Savings
                  </Text>
                  <Switch
                    style={{
                      transform: [{scaleX: 1.3}, {scaleY: 1.3}],
                      marginRight: 10,
                    }}
                    trackColor={{
                      false: '#3e3e3e',
                      true: mainColor + '77',
                    }}
                    thumbColor={
                      this.context.value.savingsActive ? mainColor : '#f4f3f4'
                    }
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={async () => {
                      await setAsyncStorageValue({
                        savingsActive: !this.context.value.savingsActive,
                      });
                      this.context.setValue({
                        savingsActive: !this.context.value.savingsActive,
                      });
                    }}
                    value={this.context.value.savingsActive}
                  />
                </View>
                {this.context.value.savingsActive && (
                  <React.Fragment>
                    <View
                      style={{
                        borderBottomWidth: 2,
                        paddingBottom: 20,
                        borderColor: mainColor,
                      }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          width: '100%',
                        }}>
                        <Text style={[GlobalStyles.titleSaves]}>
                          Savings Period
                        </Text>
                        <RNPickerSelect
                          style={{
                            inputAndroidContainer: {
                              textAlign: 'center',
                            },
                            inputAndroid: {
                              textAlign: 'center',
                              color: 'gray',
                            },
                            viewContainer: {
                              ...GlobalStyles.input,
                              width: '55%',
                            },
                          }}
                          value={this.context.value.periodSelected}
                          items={periodsAvailable}
                          onValueChange={async value => {
                            await setAsyncStorageValue({
                              periodSelected: value,
                            });
                            this.context.setValue({
                              periodSelected: value,
                            });
                          }}
                        />
                      </View>
                      <Pressable
                        disabled={this.state.loading}
                        style={[
                          GlobalStyles.buttonStyle,
                          this.state.loading ? {opacity: 0.5} : {},
                        ]}
                        onPress={async () => {
                          await this.setStateAsync({loading: true});
                          await this.changePeriod();
                          await this.setStateAsync({loading: false});
                        }}>
                        <Text
                          style={{
                            color: 'white',
                            fontSize: 18,
                            fontWeight: 'bold',
                          }}>
                          {this.state.loading
                            ? 'Changing...'
                            : 'Change Savings Period'}
                        </Text>
                      </Pressable>
                    </View>
                    <View
                      style={
                        ({
                          width: '100%',
                        },
                        this.context.value.protocolSelected === 1 && {
                          borderBottomWidth: 2,
                          borderColor: mainColor,
                        })
                      }>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          width: '100%',
                        }}>
                        <Text style={[GlobalStyles.titleSaves]}>
                          Savings Protocol
                        </Text>
                        <RNPickerSelect
                          style={{
                            inputAndroidContainer: {
                              textAlign: 'center',
                            },
                            inputAndroid: {
                              textAlign: 'center',
                              color: 'gray',
                            },
                            viewContainer: {
                              ...GlobalStyles.input,
                              width: Dimensions.get('screen').width * 0.5,
                            },
                          }}
                          value={this.context.value.protocolSelected}
                          items={protocolsAvailable}
                          onValueChange={async protocolSelected => {
                            await setAsyncStorageValue({
                              protocolSelected,
                            });
                            this.context.setValue({
                              protocolSelected,
                            });
                          }}
                        />
                      </View>
                    </View>
                    {this.context.value.protocolSelected === 1 ? (
                      <View
                        style={{
                          width: '100%',
                          marginBottom: 20,
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignContent: 'center',
                          width: '100%',
                          borderBottomWidth: 2,
                          marginBottom: 20,
                          paddingBottom: 20,
                          borderColor: mainColor,
                        }}>
                        <Slider
                          value={this.context.value.percentage}
                          style={{
                            width: '85%',
                            height: 40,
                          }}
                          step={1}
                          minimumValue={1}
                          maximumValue={15}
                          minimumTrackTintColor="#FFFFFF"
                          maximumTrackTintColor={mainColor}
                          onValueChange={async value => {
                            await setAsyncStorageValue({
                              percentage: value,
                            });
                            this.context.setValue({
                              percentage: value,
                            });
                          }}
                        />
                        <Text
                          style={{
                            width: '20%',
                            fontSize: 24,
                            color: '#FFF',
                            fontWeight: 'bold',
                          }}>
                          {this.context.value.percentage}%
                        </Text>
                      </View>
                    )}
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignContent: 'center',
                        marginBottom: 20,
                        width: '100%',
                      }}>
                      <Text style={[GlobalStyles.titleSaves]}>
                        Next Withdraw Date
                      </Text>
                      <Pressable
                        /**
                          disabled={
                            this.state.loading ||
                            !(this.context.value.savingsDate < Date.now())
                          }
                        */
                        style={[
                          GlobalStyles.buttonStyle,
                          {width: '50%'},
                          this.state.loading ||
                          !(this.context.value.savingsDate < Date.now())
                            ? {opacity: 0.5}
                            : {},
                        ]}
                        onPress={async () => {
                          await this.changePeriod();
                          this.context.setValue({
                            isTransactionActive: true,
                            transactionData: {
                              walletSelector: 1,
                              fromChainSelector: 0,
                              command: 'transfer',
                              label: `Transfer BNB`,
                              to: this.context.value.publicKey,
                              amount: this.context.value.balancesSavings[0],
                              tokenSymbol: 'BNB',
                              maxFlag: true,
                              withSavings: false,
                            },
                          });
                        }}>
                        <Text
                          style={{
                            color: 'white',
                            fontSize: 18,
                            fontWeight: 'bold',
                          }}>
                          {!(this.context.value.savingsDate < Date.now())
                            ? formatDate(
                                new Date(this.context.value.savingsDate),
                              )
                            : this.state.loading
                            ? 'Withdrawing...'
                            : 'Withdraw Now'}
                        </Text>
                      </Pressable>
                    </View>
                  </React.Fragment>
                )}
              </View>
            </Fragment>
          ) : (
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                width: '90%',
                height: '100%',
              }}>
              <Text
                style={[
                  GlobalStyles.exoTitle,
                  {
                    textAlign: 'center',
                    fontSize: 24,
                    paddingBottom: 20,
                  },
                ]}>
                Create Savings Account
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  width: '100%',
                }}>
                <Pressable
                  disabled={this.state.loading}
                  style={[
                    GlobalStyles.buttonStyle,
                    this.state.loading ? {opacity: 0.5} : {},
                  ]}
                  onPress={() => this.createAccount()}>
                  <Text style={[GlobalStyles.buttonText]}>
                    {this.state.loading ? 'Creating...' : 'Create Account'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }
}
