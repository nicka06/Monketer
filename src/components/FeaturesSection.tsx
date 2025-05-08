/**
 * Feature data structure defining the marketing features displayed in the grid
 * Each feature has:
 * - title: Short, impactful feature name
 * - description: Detailed explanation of the feature
 * - imageSrc: URL to feature illustration (hosted on unsplash)
 */
const features = [
  {
    title: "Create",
    description: "Craft beautiful emails using our intuitive drag-and-drop editor with AI-powered suggestions.",
    imageSrc: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=500&auto=format&fit=crop&q=80",
  },
  {
    title: "Automate",
    description: "Set up sophisticated email sequences that engage your audience at just the right time.",
    imageSrc: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=80",
  },
  {
    title: "Analyze",
    description: "Track performance with detailed analytics to understand what resonates with your audience.",
    imageSrc: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=500&auto=format&fit=crop&q=80",
  },
];

/**
 * FeaturesSection Component
 * 
 * A marketing component that displays the key features of the email platform
 * in a responsive grid layout with images and descriptions.
 * 
 * Layout Structure:
 * - Header section with title and subtitle
 * - Grid of feature cards (responsive: 1/2/3 columns based on screen size)
 * - Each card has an image, title, and description
 * 
 * Styling:
 * - Uses Tailwind CSS for responsive design
 * - Implements hover effects on cards
 * - Maintains consistent spacing and typography
 */
const FeaturesSection = () => {
  return (
    // Main container with vertical padding that adjusts for different screen sizes
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header Section */}
        <div className="mx-auto max-w-2xl lg:text-center">
          {/* Purple label text */}
          <h2 className="text-base font-semibold leading-7 text-monketer-purple">Powerful Features</h2>
          {/* Main heading with responsive text size */}
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to excel at email marketing
          </p>
          {/* Subtitle/description text */}
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Our platform streamlines your email workflow from creation to delivery, helping you connect with your audience like never before.
          </p>
        </div>
        
        {/* Features Grid */}
        <div className="mt-16 grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {/* Map through features array to create feature cards */}
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="flex flex-col items-start bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              {/* Image container with hover zoom effect */}
              <div className="w-full h-48 overflow-hidden">
                <img 
                  src={feature.imageSrc} 
                  alt={feature.title} 
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
              {/* Text content container */}
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturesSection;
