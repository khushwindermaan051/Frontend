import blinkitLogo from '../assets/logos/blinkit.png';
import zeptoLogo from '../assets/logos/zepto.png';
import jiomartLogo from '../assets/logos/jiomart.jpg';
import amazonLogo from '../assets/logos/amazon.png';
import bigbasketLogo from '../assets/logos/bigbasket.png';
import swiggyLogo from '../assets/logos/swiggy.png';
import flipkartLogo from '../assets/logos/flipkart.png';
import fgroceryLogo from '../assets/logos/fgrocery.jpg';
import zomatoLogo from '../assets/logos/zomato.jpg';
import citymallLogo from '../assets/logos/citymall.png';

const SHARED = {
  masterPO: 'master_po',
  poFilterColumn: 'format',
  weightColumn: 'total_order_liters',
  unitColumn: 'unit_of_measure',
};

export const PLATFORMS = {
  blinkit: {
    slug: 'blinkit',
    name: 'Blinkit',
    color: '#f5c518',
    icon: 'B',
    logo: blinkitLogo,
    tables: {
      inventory: 'blinkit_inventory',
      secondarySells: 'blinkitSec',
      masterPO: SHARED.masterPO,
    },
    poFilterColumn: SHARED.poFilterColumn,
    poFilterValue: 'blinkit',
    weightColumn: SHARED.weightColumn,
    unitColumn: SHARED.unitColumn,
    matchColumn: 'item_id',
  },
  zepto: {
    slug: 'zepto',
    name: 'Zepto',
    color: '#7b2ff7',
    icon: 'Z',
    logo: zeptoLogo,
    tables: {
      inventory: 'zepto_inventory',
      secondarySells: 'zeptSec',
      masterPO: SHARED.masterPO,
    },
    poFilterColumn: SHARED.poFilterColumn,
    poFilterValue: 'zepto',
    weightColumn: SHARED.weightColumn,
    unitColumn: SHARED.unitColumn,
    matchColumn: 'sku_code',
  },
  jiomart: {
    slug: 'jiomart',
    name: 'JioMart',
    color: '#0078ad',
    icon: 'J',
    logo: jiomartLogo,
    tables: {
      inventory: 'jiomart_inventory',
      secondarySells: 'jiomartSec',
      masterPO: SHARED.masterPO,
    },
    poFilterColumn: SHARED.poFilterColumn,
    poFilterValue: 'jiomart',
    weightColumn: SHARED.weightColumn,
    unitColumn: SHARED.unitColumn,
    matchColumn: 'sku_id',
  },
  amazon: {
    slug: 'amazon',
    name: 'Amazon',
    color: '#ff9900',
    icon: 'A',
    logo: amazonLogo,
    tables: {
      inventory: 'amazon_inventory',
      secondarySells: 'amazon_sec_daily',
      masterPO: SHARED.masterPO,
    },
    poFilterColumn: SHARED.poFilterColumn,
    poFilterValue: 'amazon',
    weightColumn: SHARED.weightColumn,
    unitColumn: SHARED.unitColumn,
    matchColumn: 'asin',
  },
  bigbasket: {
    slug: 'bigbasket',
    name: 'BigBasket',
    color: '#84c225',
    icon: 'BB',
    logo: bigbasketLogo,
    tables: {
      inventory: 'bigbasket_inventory',
      secondarySells: 'bigbasketSec',
      masterPO: SHARED.masterPO,
    },
    poFilterColumn: SHARED.poFilterColumn,
    poFilterValue: 'big basket',
    weightColumn: SHARED.weightColumn,
    unitColumn: SHARED.unitColumn,
    matchColumn: 'sku_id',
  },
  swiggy: {
    slug: 'swiggy',
    name: 'Swiggy',
    color: '#fc8019',
    icon: 'S',
    logo: swiggyLogo,
    tables: {
      inventory: 'swiggy_inventory',
      secondarySells: 'swiggySec',
      masterPO: SHARED.masterPO,
    },
    poFilterColumn: SHARED.poFilterColumn,
    poFilterValue: 'swiggy',
    weightColumn: SHARED.weightColumn,
    unitColumn: SHARED.unitColumn,
    matchColumn: 'sku_code',
  },
  flipkart: {
    slug: 'flipkart',
    name: 'Flipkart',
    color: '#2874f0',
    icon: 'F',
    logo: flipkartLogo,
    tables: {
      inventory: 'all_platform_inventory',
      secondarySells: 'flipkartSec',
      masterPO: SHARED.masterPO,
    },
    poFilterColumn: SHARED.poFilterColumn,
    poFilterValue: 'flipkart',
    weightColumn: SHARED.weightColumn,
    unitColumn: SHARED.unitColumn,
    matchColumn: 'sku_code',
  },
  flipkart_grocery: {
    slug: 'flipkart_grocery',
    name: 'Flipkart Grocery',
    color: '#2874f0',
    icon: 'FG',
    logo: fgroceryLogo,
    tables: {
      inventory: '',
      secondarySells: 'fk_grocery',
      masterPO: SHARED.masterPO,
    },
    poFilterColumn: SHARED.poFilterColumn,
    poFilterValue: 'flipkart grocery',
    weightColumn: SHARED.weightColumn,
    unitColumn: SHARED.unitColumn,
    matchColumn: 'sku_code',
  },
  zomato: {
    slug: 'zomato',
    name: 'Zomato',
    color: '#e23744',
    icon: 'Zo',
    logo: zomatoLogo,
    tables: {
      inventory: 'zomato_inventory',
      secondarySells: 'zomatoSec',
      masterPO: SHARED.masterPO,
    },
    poFilterColumn: SHARED.poFilterColumn,
    poFilterValue: 'zomato',
    weightColumn: 'total_deliver_liter',
    unitColumn: SHARED.unitColumn,
    matchColumn: 'sku_code',
  },
  citymall: {
    slug: 'citymall',
    name: 'CityMall',
    color: '#ff6b6b',
    icon: 'CM',
    logo: citymallLogo,
    tables: {
      inventory: 'citymall_inventory',
      secondarySells: 'citymallSec',
      masterPO: SHARED.masterPO,
    },
    poFilterColumn: SHARED.poFilterColumn,
    poFilterValue: 'city mall',
    weightColumn: 'total_deliver_liter',
    unitColumn: SHARED.unitColumn,
    matchColumn: 'sku_code',
  },
};

export function getPlatformConfig(slug) {
  return PLATFORMS[slug] || null;
}

export function getAllPlatforms() {
  return Object.values(PLATFORMS);
}
