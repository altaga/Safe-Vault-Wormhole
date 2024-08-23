import {Image} from 'react-native';
import DAI from '../assets/logos/dai.png';
import ETH from '../assets/logos/eth.png';
import WETH from '../assets/logos/weth.png';
import USDC from '../assets/logos/usdc.png';
import USDbC from '../assets/logos/usdbc.png';

const w = 50;
const h = 50;

export const refreshRate = 1000 * 60;

export const iconsBlockchain = {
  dai: <Image source={DAI} style={{width: w, height: h, borderRadius: 10}} />,
  eth: <Image source={ETH} style={{width: w, height: h, borderRadius: 10}} />,
  usdc: <Image source={USDC} style={{width: w, height: h, borderRadius: 10}} />,
  weth: <Image source={WETH} style={{width: w, height: h, borderRadius: 10}} />,
  usdbc: (
    <Image source={USDbC} style={{width: w, height: h, borderRadius: 10}} />
  ),
};

export const blockchain = {
  network: 'Base',
  token: 'ETH',
  chainId: 8453,
  blockExplorer: 'https://basescan.org/',
  rpc: 'https://base.llamarpc.com/',
  iconSymbol: 'eth',
  decimals: 18,
  tokens: [
    // Updated April/19/2024
    {
      name: 'Ethereum (Base)',
      symbol: 'ETH',
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      icon: iconsBlockchain.eth,
      coingecko: 'ethereum',
    },
    {
      name: 'Wrapped Ether',
      symbol: 'WETH',
      address: '0x4200000000000000000000000000000000000006',
      decimals: 18,
      icon: iconsBlockchain.weth,
      coingecko: 'weth',
    },
    {
      name: 'USD Coin',
      symbol: 'USDC',
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      decimals: 6,
      icon: iconsBlockchain.usdc,
      coingecko: 'usd-coin',
    },
    {
      name: 'USD Base Coin',
      symbol: 'USDbC',
      address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
      decimals: 6,
      icon: iconsBlockchain.usdbc,
      coingecko: 'bridged-usd-coin-base',
    },
    {
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      decimals: 18,
      icon: iconsBlockchain.dai,
      coingecko: 'dai',
    },
  ],
};

export const EntryPoint = '0x26c39F19f22B0f0f48725C4c1e5196aa5F9B7847';
export const MultiOwnerAccountAbstractionFactory =
  '0x0d29EBC0d84AF212762081e6c3f5993180f7C7cF';
export const SafeAccountCreation = '0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC';
export const BatchTokenBalancesAddress =
  '0xA0D8A1940e4439e6595B74993Cc49f2d8364f7Ff';

// Cloud Account Credentials
export const CloudAccountController =
  '0x72b9EB24BFf9897faD10B3100D35CEE8eDF8E43b';
export const CloudPublicKeyEncryption = `
-----BEGIN RSA PUBLIC KEY-----
MIIBCgKCAQEAtflt9yF4G1bPqTHtOch47UW9hkSi4u2EZDHYLLSKhGMwvHjajTM+
wcgxV8dlaTh1av/2dWb1EE3UMK0KF3CB3TZ4t/p+aQGhyfsGtBbXZuwZAd8CotTn
BLRckt6s3jPqDNR3XR9KbfXzFObNafXYzP9vCGQPdJQzuTSdx5mWcPpK147QfQbR
K0gmiDABYJMMUos8qaiKVQmSAwyg6Lce8x+mWvFAZD0PvaTNwYqcY6maIztT6h/W
mfQHzt9Z0nwQ7gv31KCw0Tlh7n7rMnDbr70+QVd8e3qMEgDYnx7Jm4BzHjr56IvC
g5atj1oLBlgH6N/9aUIlP5gkw89O3hYJ0QIDAQAB
-----END RSA PUBLIC KEY-----
`;
