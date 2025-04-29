
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

const FeaturesSection = () => {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-emailore-purple">Powerful Features</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to excel at email marketing
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Our platform streamlines your email workflow from creation to delivery, helping you connect with your audience like never before.
          </p>
        </div>
        
        <div className="mt-16 grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="flex flex-col items-start bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <div className="w-full h-48 overflow-hidden">
                <img 
                  src={feature.imageSrc} 
                  alt={feature.title} 
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
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
