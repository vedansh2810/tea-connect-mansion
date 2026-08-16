/**
 * Tea Content Mansion — menu, transcribed from the printed card.
 *
 * Shape:
 *   section { id, name, kicker, note?, groups[] }
 *   group   { id, name, tiers?, addOn?, footnote?, items[] }
 *   item    { id, name, price | prices[], note?, choices?, chef? }
 *
 *   tiers    — one row, several serving sizes (the chai pots).
 *   addOn    — optional extra offered on every item in the group.
 *   choices  — a required pick the kitchen needs (Dry / Gravy).
 *   chef     — carries the chef's-hat mark from the printed card.
 *
 * Prices are rupees, before GST. The whole menu is vegetarian.
 */

export const RESTAURANT = {
  name: 'Tea Content Mansion',
  shortName: 'TCM',
  hours: 'Open 24×7',
  taxNote: 'GST extra, as applicable',
  vegNote: 'Entirely vegetarian kitchen',
}

export const MENU = [
  {
    id: 'hot-brews',
    name: 'Hot Brews & Blends',
    kicker: 'Brewed to order',
    note: 'Every cup is freshly brewed to order with aromatic spices, rich tea leaves, and comforting flavours in every sip. Served hot, brewed with love.',
    groups: [
      {
        id: 'chai-classics',
        name: 'Chai Classics',
        tiers: ['Single', 'Pot for 2', 'Pot for 4'],
        items: [
          { id: 'adrak-chai', name: 'Adrak Chai', prices: [60, 100, 180] },
          { id: 'elaichi-chai', name: 'Elaichi Chai', prices: [60, 100, 180] },
          { id: 'adrak-elaichi-chai', name: 'Adrak Elaichi Chai', prices: [70, 120, 220], chef: true },
          { id: 'masala-chai', name: 'Masala Chai', prices: [70, 120, 220] },
          { id: 'kadak-chai', name: 'Kadak Chai', prices: [70, 120, 220] },
          { id: 'kesar-chai', name: 'Kesar Chai', prices: [90, 160, 300] },
        ],
      },
      {
        id: 'tea-infusions',
        name: 'Tea Infusions',
        items: [
          { id: 'black-tea', name: 'Black Tea', price: 50 },
          { id: 'darjeeling-tea', name: 'Darjeeling Tea', price: 60 },
          { id: 'lemon-tea', name: 'Lemon Tea', price: 60 },
          { id: 'evergreen-tea', name: 'Evergreen Tea', price: 70 },
          { id: 'hibiscus-tea', name: 'Hibiscus Tea', price: 70 },
          { id: 'lemon-ginger-tea', name: 'Lemon & Ginger Tea', price: 70 },
          { id: 'himalayan-kahawa', name: 'Himalayan Kahawa', price: 70 },
        ],
      },
      {
        id: 'coffee-brews',
        name: 'Coffee Brews',
        items: [
          { id: 'black-coffee', name: 'Black Coffee', price: 90 },
          { id: 'hand-beaten-hot-coffee', name: 'Hand Beaten Hot Coffee', price: 150 },
          { id: 'vanilla-hot-coffee', name: 'Vanilla Hot Coffee', price: 160 },
          { id: 'caramel-hot-coffee', name: 'Caramel Hot Coffee', price: 160 },
          { id: 'cinnamon-hot-coffee', name: 'Cinnamon Hot Coffee', price: 160 },
          { id: 'hazelnut-hot-coffee', name: 'Hazelnut Hot Coffee', price: 160 },
        ],
      },
    ],
  },

  {
    id: 'crafted-coolers',
    name: 'Crafted Coolers',
    kicker: 'Shaken, iced, poured',
    groups: [
      {
        id: 'cold-brews',
        name: 'Cold Brews',
        addOn: { id: 'ice-cream', label: 'Ice cream', price: 40 },
        items: [
          { id: 'classic-cold-coffee', name: 'Classic Cold Coffee', price: 175 },
          { id: 'hazelnut-cold-coffee', name: 'Hazelnut Cold Coffee', price: 200 },
          { id: 'caramel-cold-coffee', name: 'Caramel Cold Coffee', price: 200 },
          { id: 'hazelnut-caramel-cold-coffee', name: 'Hazelnut & Caramel Cold Coffee', price: 220 },
        ],
      },
      {
        id: 'thick-shakes',
        name: 'Thick Shakes',
        addOn: { id: 'ice-cream', label: 'Ice cream', price: 40 },
        items: [
          { id: 'chocolate-shudder', name: 'Chocolate Shudder', price: 190 },
          { id: 'oreo-volcano', name: 'Oreo Volcano', price: 190 },
          { id: 'kitkat-freezer', name: 'KitKat Freezer', price: 190 },
          { id: 'butterscotch-shake', name: 'Butterscotch Shake', price: 200 },
          { id: 'strawberry-shake', name: 'Strawberry Shake', price: 200 },
          { id: 'nutella-shake', name: 'Nutella Shake', price: 200 },
          { id: 'brownie-shake', name: 'Brownie Shake', price: 200 },
          { id: 'biscoff-shake', name: 'Biscoff Shake', price: 200 },
          { id: 'bubblegum-shake', name: 'Bubblegum Shake', price: 200 },
          { id: 'paan-shake', name: 'Paan Shake', price: 200 },
          { id: 'popcorn-shake', name: 'Popcorn Shake', price: 200 },
          { id: 'ferrero-rocher-shake', name: 'Ferrero Rocher Shake', price: 250 },
        ],
      },
      {
        id: 'tea-coolers',
        name: 'Tea Coolers',
        items: [
          { id: 'lemon-mint-ice-tea', name: 'Lemon Mint Ice Tea', price: 140 },
          { id: 'watermelon-ice-tea', name: 'Watermelon Ice Tea', price: 150 },
          { id: 'peach-ice-tea', name: 'Peach Ice Tea', price: 150 },
          { id: 'hibiscus-ice-tea', name: 'Hibiscus Ice Tea', price: 160 },
          { id: 'redbull-ice-tea', name: 'Redbull Ice Tea', price: 220 },
        ],
      },
      {
        id: 'mocktails',
        name: 'Mocktails',
        items: [
          { id: 'virgin-mint-mojito', name: 'Virgin Mint Mojito', price: 150 },
          { id: 'blue-ocean', name: 'Blue Ocean', price: 150 },
          { id: 'cranberry-mojito', name: 'Cranberry Mojito', price: 160 },
          { id: 'roohafza-minto', name: 'Roohafza Minto', price: 160 },
          { id: 'orange-basil-mojito', name: 'Orange Basil Mojito', price: 160 },
          { id: 'jaljeera-mojito', name: 'Jaljeera Mojito', price: 160 },
          { id: 'watermelon-mojito', name: 'Watermelon Mojito', price: 160 },
          { id: 'green-apple-mojito', name: 'Green Apple Mojito', price: 160 },
          { id: 'litchi-rose-mojito', name: 'Litchi Rose Mojito', price: 180 },
          { id: 'orange-ginger-spritz', name: 'Orange Ginger Spritz', price: 180 },
          { id: 'cucumber-mint-cooler', name: 'Cucumber Mint Cooler', price: 200 },
          { id: 'blackberry-basil-fizz', name: 'Blackberry Basil Fizz', price: 200 },
          { id: 'strawberry-masala-soda', name: 'Strawberry Masala Soda', price: 200 },
          { id: 'coconut-surprise', name: 'Coconut Surprise', price: 200 },
          { id: 'spiced-jamun', name: 'Spiced Jamun', price: 200 },
          { id: 'fluorescent-delight', name: 'Fluorescent Delight', price: 200 },
        ],
      },
      {
        id: 'chilled-sips',
        name: 'Chilled Sips',
        items: [
          { id: 'coke-sprite', name: 'Coke / Sprite', price: 75, choices: ['Coke', 'Sprite'] },
          { id: 'masala-cola', name: 'Masala Cola', price: 100 },
          { id: 'fresh-lime-soda', name: 'Fresh Lime Soda', price: 120 },
          { id: 'fresh-lime-water', name: 'Fresh Lime Water', price: 100 },
          { id: 'redbull', name: 'Redbull', price: 220 },
          { id: 'water', name: 'Water', price: 40 },
          { id: 'sweet-lassi', name: 'Sweet Lassi', price: 125 },
          { id: 'buttermilk', name: 'Buttermilk', price: 80 },
        ],
      },
    ],
  },

  {
    id: 'desi-cravings',
    name: 'Desi Cravings',
    kicker: 'Street-side classics',
    note: 'Freshly prepared with bold spices, crisp textures, and comforting flavours, our savoury classics bring the charm of street-side favourites to every bite.',
    groups: [
      {
        id: 'bun-toast',
        name: 'Bun & Toast',
        items: [
          { id: 'bun-muska', name: 'Bun Muska', price: 80 },
          { id: 'jam-muska', name: 'Jam Muska', price: 90 },
          { id: 'bhujia-bun', name: 'Bhujia Bun', price: 90 },
          { id: 'nutella-bun-muska', name: 'Nutella Bun Muska', price: 150 },
          { id: 'butter-toast', name: 'Butter Toast', price: 95 },
          { id: 'nutella-toast', name: 'Nutella Toast', price: 145 },
        ],
      },
      {
        id: 'vada-pav',
        name: 'Vada Pav',
        items: [
          { id: 'classic-vada-pav', name: 'Classic Vada Pav', price: 100 },
          { id: 'tawa-masala-vada-pav', name: 'Tawa Masala Vada Pav', price: 110, chef: true },
          { id: 'achari-vada-pav', name: 'Achari Vada Pav', price: 120 },
          { id: 'cheese-vada-pav', name: 'Cheese Vada Pav', price: 120 },
        ],
      },
      {
        id: 'maggi-bowls',
        name: 'Maggi Bowls',
        items: [
          { id: 'ghar-wali-maggi', name: 'Ghar Wali Maggi', price: 100 },
          { id: 'masala-maggi', name: 'Masala Maggi', price: 150 },
          { id: 'veggie-blast-maggi', name: 'Veggie Blast Maggi', price: 150 },
          { id: 'punjabi-tadka-maggi', name: 'Punjabi Tadka Maggi', price: 170, chef: true },
          { id: 'veg-cheese-maggi', name: 'Veg Cheese Maggi', price: 170 },
        ],
      },
      {
        id: 'poha-bowls',
        name: 'Poha Bowls',
        items: [
          { id: 'classic-poha', name: 'Classic Poha', price: 70 },
          { id: 'aloo-chilli-poha', name: 'Aloo Chilli Poha', price: 100 },
          { id: 'paneer-poha', name: 'Paneer Poha', price: 120 },
        ],
      },
      {
        id: 'desi-chaat',
        name: 'Desi Chaat',
        items: [
          { id: 'bingo-chaat', name: 'Bingo Chaat', price: 120 },
          { id: 'sev-puri', name: 'Sev Puri', price: 150 },
          { id: 'bhel-puri', name: 'Bhel Puri', price: 150 },
          { id: 'papdi-chaat', name: 'Papdi Chaat', price: 150 },
          { id: 'puchka-shots', name: 'Puchka Shots', price: 150 },
          { id: 'peanut-masala', name: 'Peanut Masala', price: 150 },
          { id: 'delhi-aloo-chaat', name: 'Delhi Aloo Chaat', price: 160 },
          { id: 'nachos-bhel', name: 'Nachos Bhel', price: 170 },
        ],
      },
      {
        id: 'crispy-pakode',
        name: 'Crispy Pakode',
        items: [
          { id: 'aloo-pyaaz-pakode', name: 'Aloo Pyaaz Pakode', price: 130 },
          { id: 'kanda-bhajia', name: 'Kanda Bhajia', price: 150 },
          { id: 'mix-veg-pakode', name: 'Mix Veg Pakode', price: 170 },
          { id: 'bread-pakode', name: 'Bread Pakode', price: 180 },
          { id: 'paneer-peri-peri-pakode', name: 'Paneer Peri Peri Pakode', price: 200, chef: true },
          { id: 'dal-ke-pakode', name: 'Dal Ke Pakode', price: 250, note: 'Winter special' },
        ],
      },
    ],
  },

  {
    id: 'global-bites',
    name: 'Global Bites',
    kicker: 'Wok, griddle, fryer',
    groups: [
      {
        id: 'wok-edit',
        name: 'The Wok Edit',
        items: [
          { id: 'wok-tossed-noodles', name: 'Wok Tossed Noodles', price: 150 },
          { id: 'wok-tossed-hakka-noodles', name: 'Wok Tossed Hakka Noodles', price: 170 },
          { id: 'burnt-garlic-noodles', name: 'Burnt Garlic Noodles', price: 170 },
          { id: 'schezwan-noodles', name: 'Schezwan Noodles', price: 170 },
          { id: 'chilli-garlic-noodles', name: 'Chilli Garlic Noodles', price: 180, chef: true },
          { id: 'veg-manchurian', name: 'Veg Manchurian', price: 180, choices: ['Dry', 'Gravy'] },
          { id: 'manchurian-fried-rice', name: 'Manchurian with Fried Rice', price: 300 },
          { id: 'chinese-bhel', name: 'Chinese Bhel', price: 200 },
          { id: 'crispy-corn', name: 'Crispy Corn', price: 200 },
          { id: 'honey-chilli-potato', name: 'Honey Chilli Potato', price: 170 },
          { id: 'chilli-paneer', name: 'Chilli Paneer', price: 250, choices: ['Dry', 'Gravy'] },
          { id: 'spring-roll', name: 'Spring Roll', price: 175 },
        ],
      },
      {
        id: 'nachos',
        name: 'Nachos',
        items: [
          { id: 'nachos-platter', name: 'Nachos Platter', price: 175 },
          { id: 'cheesy-nachos', name: 'Cheesy Nachos', price: 200 },
          { id: 'baked-cheesy-nachos', name: 'Baked Cheesy Nachos', price: 220 },
        ],
      },
      {
        id: 'momos',
        name: 'Momos',
        items: [
          { id: 'steamed-momos', name: 'Steamed Momos', price: 125 },
          { id: 'fried-momos', name: 'Fried Momos', price: 145 },
          { id: 'chilli-cheese-momos', name: 'Chilli Cheese Momos', price: 155 },
          { id: 'kurkure-momos', name: 'Kurkure Momos', price: 195 },
        ],
      },
      {
        id: 'fries',
        name: 'Fries',
        items: [
          { id: 'salted-fries', name: 'Salted Fries', price: 150 },
          { id: 'peri-peri-french-fries', name: 'Peri Peri French Fries', price: 180 },
          { id: 'cheesy-french-fries', name: 'Cheesy French Fries', price: 200 },
          { id: 'cheesy-peri-peri-fries', name: 'Cheesy Peri Peri Fries', price: 220 },
        ],
      },
      {
        id: 'wraps',
        name: 'Wraps',
        items: [
          { id: 'vegetable-wrap', name: 'Vegetable Wrap', price: 150 },
          { id: 'crispy-crunch-wrap', name: 'Crispy Crunch Wrap', price: 160 },
          { id: 'mushroom-cheese-wrap', name: 'Mushroom Cheese Wrap', price: 180, chef: true },
          { id: 'makhani-paneer-wrap', name: 'Makhani Paneer Wrap', price: 200 },
        ],
      },
      {
        id: 'rolls',
        name: 'Rolls',
        items: [
          { id: 'vegetable-roll', name: 'Vegetable Roll', price: 175 },
          { id: 'paneer-bhurji-roll', name: 'Paneer Bhurji Roll', price: 195 },
          { id: 'bollywich-roll', name: 'Bollywich Roll', price: 225 },
        ],
      },
    ],
  },

  {
    id: 'bread-affair',
    name: 'The Bread Affair',
    kicker: 'Toasted, pressed, baked',
    groups: [
      {
        id: 'sandwich',
        name: 'Sandwich',
        addOn: { id: 'cheese', label: 'Cheese', price: 30 },
        items: [
          { id: 'mumbai-sandwich', name: 'Mumbai Sandwich', price: 95 },
          { id: 'aloo-masala-grilled', name: 'Aloo Masala Grilled', price: 145 },
          { id: 'veg-club-sandwich', name: 'Veg Club Sandwich', price: 195 },
          { id: 'tandoori-paneer-sandwich', name: 'Tandoori Paneer Sandwich', price: 215 },
          { id: 'melting-cheese-sandwich', name: 'Melting Cheese Sandwich', price: 215, chef: true },
          { id: 'mushroom-cheese-sandwich', name: 'Mushroom Cheese Sandwich', price: 215 },
          { id: 'cheese-corn-sandwich', name: 'Cheese Corn Sandwich', price: 215 },
        ],
      },
      {
        id: 'panini',
        name: 'Panini',
        items: [
          { id: 'indie-masala-panini', name: 'Indie Masala Panini', price: 145 },
          { id: 'garden-fresh-panini', name: 'Garden Fresh Panini', price: 155 },
          { id: 'tandoori-paneer-panini', name: 'Tandoori Paneer Panini', price: 195 },
          { id: 'mushroom-cheese-panini', name: 'Mushroom Cheese Panini', price: 195 },
        ],
      },
      {
        id: 'garlic-breads',
        name: 'Garlic Breads',
        items: [
          { id: 'chilli-cheese-toast', name: 'Chilli Cheese Toast', price: 150 },
          { id: 'cheese-garlic-bread', name: 'Cheese Garlic Bread', price: 175 },
          { id: 'masala-garlic-bread', name: 'Masala Garlic Bread', price: 185 },
          { id: 'burnt-garlic-boat', name: 'Burnt Garlic Boat', price: 400, chef: true },
          { id: 'pull-apart-garlic-bread', name: 'Pull Apart Garlic Bread', price: 400 },
        ],
      },
      {
        id: 'pizza',
        name: 'Pizza',
        items: [
          { id: 'americano-corn-pizza', name: 'Americano Corn Pizza', price: 275 },
          { id: 'classic-margherita-pizza', name: 'Classic Margherita Pizza', price: 285 },
          { id: 'otc-pizza', name: 'OTC Pizza', price: 295 },
          { id: 'mushroom-cheese-pizza', name: 'Mushroom Cheese Pizza', price: 325 },
          { id: 'smokey-tandoori-paneer-pizza', name: 'Smokey Tandoori Paneer Pizza', price: 395 },
          { id: 'gun-powder-pizza', name: 'Gun Powder Pizza', price: 425, chef: true },
          { id: 'farmhouse-pizza', name: 'Farmhouse Pizza', price: 425 },
        ],
      },
      {
        id: 'pasta',
        name: 'Pasta',
        items: [
          { id: 'pasta-penne-alfredo', name: 'Pasta Penne Alfredo', price: 250 },
          { id: 'pasta-penne-arrabiata', name: 'Pasta Penne Arrabiata', price: 250 },
          { id: 'pink-italian-pasta', name: 'Pink Italian Pasta', price: 300 },
          { id: 'pesto-pasta', name: 'Pesto Pasta', price: 320 },
          { id: 'voo-doo-pasta', name: 'Voo Doo Pasta', price: 350, chef: true },
        ],
      },
    ],
  },

  {
    id: 'desi-flavours',
    name: 'Desi Flavours',
    kicker: 'From the tandoor and the pot',
    groups: [
      {
        id: 'soup',
        name: 'Soup',
        items: [
          { id: 'tomato-soup', name: 'Tomato Soup', price: 155 },
          { id: 'manchow-soup', name: 'Manchow Soup', price: 165 },
          { id: 'sweet-corn-soup', name: 'Sweet Corn Soup', price: 165 },
          { id: 'hot-sour-soup', name: 'Hot & Sour Soup', price: 165 },
        ],
      },
      {
        id: 'tikka-bar',
        name: 'Tikka Bar',
        items: [
          { id: 'paneer-tikka', name: 'Paneer Tikka', price: 180 },
          { id: 'malai-paneer-tikka', name: 'Malai Paneer Tikka', price: 190 },
          { id: 'special-tandoori-chaap', name: 'Special Tandoori Chaap', price: 180 },
          { id: 'malai-chaap', name: 'Malai Chaap', price: 190 },
          { id: 'achari-chaap', name: 'Achari Chaap', price: 200 },
          { id: 'afghani-chaap', name: 'Afghani Chaap', price: 220 },
          { id: 'malai-broccoli', name: 'Malai Broccoli', price: 220 },
          { id: 'badami-broccoli', name: 'Badami Broccoli', price: 300 },
          { id: 'grilled-pineapple', name: 'Grilled Pineapple', price: 180 },
          { id: 'spicy-grilled-mushroom', name: 'Spicy Grilled Mushroom', price: 180 },
        ],
      },
      {
        id: 'comfort-pot',
        name: 'Comfort Pot',
        addOn: { id: 'curd-pickle-papad', label: 'Curd, pickle & papad', price: 60 },
        items: [
          { id: 'ghar-wali-khichdi', name: 'Ghar Wali Khichdi', price: 129 },
          { id: 'masala-khichdi', name: 'Masala Khichdi', price: 139 },
          { id: 'veggie-khichdi', name: 'Veggie Khichdi', price: 159 },
          { id: 'lemon-garlic-khichdi', name: 'Lemon Garlic Khichdi', price: 159 },
          { id: 'desi-ghee-khichdi', name: 'Desi Ghee Khichdi', price: 179, chef: true },
        ],
      },
      {
        id: 'parathas',
        name: 'Parathas',
        footnote: 'Served with pickle & curd',
        items: [
          { id: 'aloo-pyaaz-paratha', name: 'Aloo Pyaaz Paratha', price: 160 },
          { id: 'gobhi-paratha', name: 'Gobhi Paratha', price: 160 },
          { id: 'paneer-paratha', name: 'Paneer Paratha', price: 170 },
          { id: 'mix-veg-paratha', name: 'Mix Veg Paratha', price: 170 },
        ],
      },
      {
        id: 'desi-plates',
        name: 'Desi Plates',
        items: [
          { id: 'choley-bhature', name: 'Choley Bhature', price: 199 },
          { id: 'mumbai-pav-bhaji', name: 'Mumbai Pav Bhaji', price: 189 },
          { id: 'cheese-pav-bhaji', name: 'Cheese Pav Bhaji', price: 199 },
          {
            id: 'royal-paneer-plate',
            name: 'Royal Paneer Plate',
            price: 179,
            note: 'Shahi paneer, butter naan, raita',
          },
          {
            id: 'makhani-naan-affair',
            name: 'Makhani Naan Affair',
            price: 179,
            note: 'Dal makhani, garlic naan, raita',
          },
          {
            id: 'comfort-bowl',
            name: 'The Comfort Bowl',
            price: 179,
            note: 'Dal or choley, rice, raita',
            choices: ['Dal', 'Choley'],
          },
          {
            id: 'paneer-makhani-bowl',
            name: 'Paneer Makhani Bowl',
            price: 199,
            note: 'Paneer butter masala, rice, raita',
          },
          {
            id: 'chur-chur-makhani',
            name: 'Chur Chur Makhani',
            price: 219,
            note: 'Dal makhani, chur chur naan',
          },
        ],
      },
      {
        id: 'royal-thali',
        name: 'Royal Thali',
        items: [
          {
            id: 'everyday-thali',
            name: 'Everyday Thali',
            price: 199,
            note: 'Dal, seasonal veg, 2 tandoori roti, raita, rice, salad, sweet',
          },
          {
            id: 'grand-thali',
            name: 'Grand Thali',
            price: 259,
            note: 'Dal, paneer tikka masala, choley masala, 2 tandoori roti, veg raita, salad, rice, sweet',
          },
        ],
      },
      {
        id: 'mains',
        name: 'Mains',
        items: [
          { id: 'jeera-aloo', name: 'Jeera Aloo', price: 175 },
          { id: 'dal-fry', name: 'Dal Fry', price: 195 },
          { id: 'punjabi-dal-dhaba', name: 'Punjabi Dal Dhaba', price: 215, chef: true },
          { id: 'malai-pyaaz', name: 'Malai Pyaaz', price: 215 },
          { id: 'sev-tamatar', name: 'Sev Tamatar', price: 215 },
          { id: 'mix-veg', name: 'Mix Veg', price: 215 },
          { id: 'gatta-masala', name: 'Gatta Masala', price: 215 },
          { id: 'dal-makhani', name: 'Dal Makhani', price: 225 },
          { id: 'chana-masala', name: 'Chana Masala', price: 225 },
          { id: 'methi-matar-malai', name: 'Methi Matar Malai', price: 225 },
          { id: 'navratan-korma', name: 'Navratan Korma', price: 250 },
          { id: 'malai-kofta', name: 'Malai Kofta', price: 250, choices: ['Red', 'White'] },
          { id: 'shahi-paneer', name: 'Shahi Paneer', price: 250 },
          { id: 'tawa-masala-chaap', name: 'Tawa Masala Chaap', price: 250 },
          { id: 'butter-masala-chaap', name: 'Butter Masala Chaap', price: 250 },
          { id: 'kali-mirch-chaap', name: 'Kali Mirch Chaap', price: 250, chef: true },
          { id: 'paneer-butter-masala', name: 'Paneer Butter Masala', price: 250 },
          { id: 'paneer-lababdar', name: 'Paneer Lababdar', price: 250, chef: true },
          { id: 'kadhai-paneer', name: 'Kadhai Paneer', price: 250 },
          { id: 'paneer-bhurji', name: 'Paneer Bhurji', price: 250 },
          { id: 'kaju-curry', name: 'Kaju Curry', price: 275 },
        ],
      },
      {
        id: 'rice',
        name: 'Rice',
        items: [
          { id: 'steamed-rice', name: 'Steamed Rice', price: 130 },
          { id: 'fried-rice', name: 'Fried Rice', price: 140 },
          { id: 'jeera-rice', name: 'Jeera Rice', price: 140 },
          { id: 'veg-pulao', name: 'Veg Pulao', price: 160 },
          { id: 'paneer-pulao', name: 'Paneer Pulao', price: 180 },
          { id: 'navratan-pulao', name: 'Navratan Pulao', price: 200 },
          { id: 'veg-biryani', name: 'Veg Biryani', price: 250 },
          { id: 'paneer-tikka-biryani', name: 'Paneer Tikka Biryani', price: 260, chef: true },
          { id: 'tandoori-chaap-biryani', name: 'Tandoori Chaap Biryani', price: 260 },
        ],
      },
      {
        id: 'breads',
        name: 'Breads',
        items: [
          { id: 'tandoori-roti-plain', name: 'Tandoori Roti Plain', price: 30 },
          { id: 'tandoori-roti-butter', name: 'Tandoori Roti Butter', price: 35 },
          { id: 'plain-naan', name: 'Plain Naan', price: 60 },
          { id: 'butter-naan', name: 'Butter Naan', price: 70 },
          { id: 'laccha-parantha', name: 'Laccha Parantha', price: 70 },
          { id: 'garlic-naan', name: 'Garlic Naan', price: 80 },
          { id: 'stuffed-naan', name: 'Stuffed Naan', price: 120 },
          { id: 'chur-chur-naan', name: 'Chur Chur Naan', price: 140, chef: true },
        ],
      },
      {
        id: 'raita',
        name: 'Raita',
        items: [
          { id: 'plain-curd', name: 'Plain Curd', price: 90 },
          { id: 'boondi-raita', name: 'Boondi Raita', price: 125 },
          { id: 'vegetable-raita', name: 'Vegetable Raita', price: 145 },
          { id: 'pineapple-raita', name: 'Pineapple Raita', price: 145 },
        ],
      },
      {
        id: 'extras',
        name: 'Extras',
        items: [
          { id: 'roasted-papad', name: 'Roasted Papad', price: 50 },
          { id: 'masala-papad', name: 'Masala Papad', price: 100 },
          { id: 'green-salad', name: 'Green Salad', price: 80 },
        ],
      },
    ],
  },

  {
    id: 'sweet-indulgences',
    name: 'Sweet Indulgences',
    kicker: 'The last course',
    groups: [
      {
        id: 'fluffy-pancakes',
        name: 'Fluffy Pancakes',
        addOn: { id: 'ice-cream', label: 'Ice cream', price: 40 },
        items: [
          { id: 'classic-pancake-maple', name: 'Classic Pancake with Maple Syrup', price: 175 },
          { id: 'choco-chunk-pancake', name: 'Choco Chunk Pancake', price: 195 },
          { id: 'nutella-pancake', name: 'Nutella Pancake', price: 225 },
          { id: 'belgian-dark-chocolate-pancake', name: 'Belgian Dark Chocolate Pancake', price: 225 },
          { id: 'oreo-cream-cheese-pancake', name: 'Oreo and Cream Cheese Pancake', price: 225, chef: true },
          { id: 'kitkat-pancake', name: 'KitKat Pancake', price: 225 },
        ],
      },
      {
        id: 'artisan-waffles',
        name: 'Artisan Waffles',
        addOn: { id: 'ice-cream', label: 'Ice cream', price: 40 },
        items: [
          { id: 'classic-waffle-maple', name: 'Classic Waffle with Maple Syrup', price: 175 },
          { id: 'choco-chunk-waffle', name: 'Choco Chunk Waffle', price: 195 },
          { id: 'nutella-waffle', name: 'Nutella Waffle', price: 225 },
          { id: 'belgian-dark-chocolate-waffle', name: 'Belgian Dark Chocolate Waffle', price: 225 },
          { id: 'oreo-cream-cheese-waffle', name: 'Oreo and Cream Cheese Waffle', price: 225 },
          { id: 'kitkat-waffle', name: 'KitKat Waffle', price: 225 },
        ],
      },
      {
        id: 'cheesecakes',
        name: 'Cheesecakes',
        items: [
          { id: 'new-york-baked-cheesecake', name: 'New York Baked Cheesecake Slice', price: 239 },
          { id: 'biscoff-cheesecake', name: 'Biscoff Cheesecake Slice', price: 249 },
          { id: 'blueberry-cheesecake', name: 'Blueberry Cheesecake Slice', price: 249 },
        ],
      },
      {
        id: 'brownie-melts',
        name: 'Brownie Melts',
        items: [
          { id: 'hot-brownie', name: 'Hot Brownie', price: 175 },
          { id: 'hot-brownie-fudge', name: 'Hot Brownie Fudge', price: 225, chef: true },
          { id: 'sizzling-brownie-ice-cream', name: 'Sizzling Brownie with Ice Cream', price: 295 },
        ],
      },
      {
        id: 'pastries',
        name: 'Pastries',
        items: [
          { id: 'belgian-chocolate-pastry', name: 'Belgian Chocolate Pastry', price: 175 },
          { id: 'almond-honey-vanilla-pastry', name: 'Almond Honey Vanilla Pastry', price: 225 },
          { id: 'red-velvet-pastry', name: 'Red Velvet Pastry', price: 295 },
        ],
      },
      {
        id: 'creamy-scoops',
        name: 'Creamy Scoops',
        items: [
          { id: 'vanilla-ice-cream', name: 'Vanilla Ice Cream', price: 100 },
          { id: 'butterscotch-ice-cream', name: 'Butterscotch Ice Cream', price: 100 },
          { id: 'strawberry-ice-cream', name: 'Strawberry Ice Cream', price: 100 },
          { id: 'chocolate-ice-cream', name: 'Chocolate Ice Cream', price: 120 },
        ],
      },
    ],
  },
]

/** Flat index for search and for rebuilding a cart line from its ids. */
export const ITEM_INDEX = MENU.flatMap((section) =>
  section.groups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      sectionId: section.id,
      sectionName: section.name,
      groupId: group.id,
      groupName: group.name,
      tiers: group.tiers,
      addOn: group.addOn,
      basePrice: item.price ?? item.prices?.[0],
    })),
  ),
)

export const TOTAL_ITEMS = ITEM_INDEX.length

export const CHEF_SPECIALS = ITEM_INDEX.filter((item) => item.chef)

export function findItem(itemId) {
  return ITEM_INDEX.find((item) => item.id === itemId)
}
