import React, {Component} from 'react';
import {
  Image,
  NativeEventEmitter,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Renders from '../../assets/logo.png';
import Title from '../../assets/title.png';
import GlobalStyles, {header, mainColor} from '../../styles/styles';
import ContextModule from '../../utils/contextModule';
import {
  epsilonRound,
  findIndexByProperty,
  getAsyncStorageValue,
  setAsyncStorageValue,
} from '../../utils/utils';
import {blockchains, refreshRate} from '../../utils/constants';
import {ethers} from 'ethers';

class RedeemWallet extends Component {
  constructor(props) {
    super(props);
    this.state = {
      pendingRedeems: [],
      refreshing: false,
    };
    this.EventEmitter = new NativeEventEmitter();
  }

  static contextType = ContextModule;

  componentDidMount() {
    this.props.navigation.addListener('focus', async () => {
      console.log(this.props.route.name);
      this.EventEmitter.addListener('updateRedeems', async () => {
        await this.refresh();
      });
      const refreshCheck = Date.now();
      const lastRefresh = await this.getLastRefresh();
      if (refreshCheck - lastRefresh >= refreshRate) {
        // 2.5 minutes
        await setAsyncStorageValue({lastRefreshWorm: Date.now().toString()});
        this.setState({refreshing: true});
        this.refresh();
      } else {
        console.log(
          `Next refresh Available: ${Math.round(
            (refreshRate - (refreshCheck - lastRefresh)) / 1000,
          )} Seconds`,
        );
      }
    });
    this.props.navigation.addListener('blur', async () => {
      this.EventEmitter.removeAllListeners('updateRedeems');
    });
  }

  async getLastRefresh() {
    try {
      const lastRefreshWorm = await getAsyncStorageValue('lastRefreshWorm');
      if (lastRefreshWorm === null) throw 'Set First Date';
      return lastRefreshWorm;
    } catch (err) {
      await setAsyncStorageValue({lastRefreshWorm: '0'.toString()});
      return 0;
    }
  }

  async refresh() {
    const myHeaders = new Headers();
    myHeaders.append('Accept', 'application/json');

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    };

    fetch(
      `https://api.wormholescan.io/api/v1/operations?page=0&pageSize=50&sortOrder=DESC&address=${this.context.value.publicKey}`,
      requestOptions,
    )
      .then(response => response.json())
      .then(result => {
        setAsyncStorageValue({
          pendingRedeems: result.operations
            .filter(obj => !('targetChain' in obj))
            .filter(
              obj =>
                obj.content.payload.toChain !== obj.content.payload.tokenChain,
            ),
        });
        this.context.setValue({
          pendingRedeems: result.operations
            .filter(obj => !('targetChain' in obj))
            .filter(
              obj =>
                obj.content.payload.toChain !== obj.content.payload.tokenChain,
            ),
        });
        this.setState({refreshing: false});
      })
      .catch(error => console.error(error));
  }

  async redeem(x) {
    this.context.setValue({
      isTransactionActive: true,
      transactionData: {
        vaa: ethers.utils.base64.decode(x.vaa.raw),
        walletSelector: 0,
        fromChainSelector: findIndexByProperty(
          blockchains,
          'wormholeChainId',
          x.content.payload.toChain,
        ),
        toChainSelector: 0,
        command: 'redeemWormhole',
        label: `Redeem on\n${
          blockchains[
            findIndexByProperty(
              blockchains,
              'wormholeChainId',
              x.content.payload.toChain,
            )
          ].network
        } Network`,
        to: blockchains[
          findIndexByProperty(
            blockchains,
            'wormholeChainId',
            x.content.payload.toChain,
          )
        ].wormholeAddress,
        amount: x.data.tokenAmount,
        tokenSymbol: x.data.symbol,
        maxFlag: false,
        withSavings: false,
      },
    });
  }

  render() {
    return (
      <View style={GlobalStyles.container}>
        <View
          style={[
            GlobalStyles.headerMain,
            {
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignContent: 'center',
            },
          ]}>
          <View style={GlobalStyles.headerItem}>
            <Image
              source={Renders}
              alt="Logo"
              style={{
                width: 192 / 3,
                height: 192 / 3,
                alignSelf: 'flex-start',
                marginLeft: 20,
              }}
            />
          </View>
          <View style={GlobalStyles.headerItem}>
            <Image
              source={Title}
              alt="Logo"
              style={{
                width: 589 * (header / (88 * 2.5)),
                height: 88 * (header / (88 * 2.5)),
              }}
            />
          </View>
        </View>
        <View
          style={[
            GlobalStyles.mainComplete,
            {justifyContent: 'space-around', alignItems: 'center'},
          ]}>
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              marginVertical: 30,
            }}>
            <Text
              style={{
                fontSize: 30,
                fontFamily: 'Exo2-Regular',
                color: 'white',
              }}>
              Pending Redeems
            </Text>
          </View>
          <ScrollView
            refreshControl={
              <RefreshControl
                progressBackgroundColor={mainColor}
                refreshing={this.state.refreshing}
                onRefresh={async () => {
                  await setAsyncStorageValue({
                    lastRefreshWorm: Date.now().toString(),
                  });
                  await this.refresh();
                }}
              />
            }
            showsVerticalScrollIndicator={false}
            style={GlobalStyles.tokensContainer}
            contentContainerStyle={{
              justifyContent: 'space-around',
              alignItems: 'center',
            }}>
            {this.context.value.pendingRedeems.map((x, i) => (
              <View key={`${i}`} style={GlobalStyles.network}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                  }}>
                  <View style={{marginHorizontal: 20}}>
                    {
                      <View>
                        {
                          blockchains[
                            findIndexByProperty(
                              blockchains,
                              'wormholeChainId',
                              x.content.payload.tokenChain,
                            )
                          ].tokens[0].icon
                        }
                      </View>
                    }
                  </View>
                  <View style={{justifyContent: 'center'}}>
                    <Text style={{fontSize: 18, color: 'white'}}>
                      {x.data.symbol}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                      }}>
                      <Text style={{fontSize: 12, color: 'white'}}>
                        {epsilonRound(x.data.tokenAmount, 8)}
                        {x.data.symbol}
                      </Text>
                    </View>
                  </View>
                </View>
                <Pressable onPress={() => this.redeem(x)}>
                  <View style={{marginHorizontal: 20}}>
                    <Text style={{color: 'white', textAlign: 'center'}}>
                      Redeem on{'\n'}
                      {
                        blockchains[
                          findIndexByProperty(
                            blockchains,
                            'wormholeChainId',
                            x.content.payload.toChain,
                          )
                        ].network
                      }
                    </Text>
                  </View>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }
}

export default RedeemWallet;
