export const CATEGORIES = {
  food: {
    label: 'Food',
    emoji: '🍕',
    words: [
      'Pizza', 'Sushi', 'Tacos', 'Burger', 'Ramen',
      'Curry', 'Paella', 'Falafel', 'Dumplings', 'Croissant',
      'Cheesecake', 'Tiramisu', 'Pho', 'Bibimbap', 'Lasagna',
      'Shawarma', 'Ceviche', 'Baklava', 'Kimchi', 'Risotto',
      'Gyoza', 'Churros', 'Hummus', 'Peking Duck', 'Moussaka',
    ],
  },
  animal: {
    label: 'Animal',
    emoji: '🦎',
    words: [
      'Elephant', 'Penguin', 'Octopus', 'Giraffe', 'Tiger',
      'Dolphin', 'Koala', 'Flamingo', 'Wolf', 'Gorilla',
      'Peacock', 'Narwhal', 'Pangolin', 'Axolotl', 'Platypus',
      'Mantis Shrimp', 'Capybara', 'Meerkat', 'Quokka', 'Tapir',
      'Blobfish', 'Aye-aye', 'Chameleon', 'Tardigrade', 'Binturong',
    ],
  },
  country: {
    label: 'Country',
    emoji: '🌍',
    words: [
      'Japan', 'Brazil', 'Egypt', 'Canada', 'Iceland',
      'Kenya', 'Vietnam', 'Peru', 'Greece', 'Norway',
      'Morocco', 'Argentina', 'Finland', 'Portugal', 'Thailand',
      'Ethiopia', 'New Zealand', 'Colombia', 'Ukraine', 'Nepal',
      'Bhutan', 'Madagascar', 'Bolivia', 'Georgia', 'Laos',
    ],
  },
  movie: {
    label: 'Movie',
    emoji: '🎬',
    words: [
      'Inception', 'Titanic', 'Avatar', 'Joker', 'Interstellar',
      'Parasite', 'Shrek', 'Frozen', 'Gladiator', 'The Matrix',
      'Clueless', 'Casablanca', 'Whiplash', 'Jaws', 'Arrival',
      'Dune', 'Spirited Away', 'The Godfather', 'Pulp Fiction', 'Moonlight',
      'Everything Everywhere', 'Hereditary', 'Midsommar', 'Annihilation', 'Past Lives',
    ],
  },
}

export function getRandomWord(category) {
  const words = CATEGORIES[category].words
  return words[Math.floor(Math.random() * words.length)]
}
