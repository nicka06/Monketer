/**
 * Testimonial data structure defining customer success stories
 * Each testimonial contains:
 * - id: Unique identifier for React key prop
 * - content: The testimonial text with customer feedback
 * - name: Customer's full name
 * - title: Customer's professional role and company
 */
const testimonials = [
  {
    id: 1,
    content: "Monketer transformed the way we handle email marketing. Our engagement rates have never been higher!",
    name: "Alexandra Chen",
    title: "Marketing Director, TechFlow Inc."
  },
  {
    id: 2,
    content: "The time saved using Monketer's templates and automation tools has been incredible. What used to take days now takes hours.",
    name: "Marcus Johnson",
    title: "Email Specialist, Retail Giant"
  },
  {
    id: 3,
    content: "The analytics provided by Monketer gave us insights we never had before. We've completely rethought our email strategy.",
    name: "Sophia Williams",
    title: "CMO, Startup Success"
  }
];

/**
 * TestimonialsSection Component
 * 
 * A marketing component that displays customer testimonials in a responsive grid layout.
 * Features a clean, card-based design with consistent branding and typography.
 * 
 * Visual Design:
 * - Light purple background for section contrast
 * - White cards with subtle shadow and border
 * - Gradient avatars with initials
 * - Typographic quotes for testimonial content
 * - Responsive grid layout (1/2/3 columns)
 * 
 * Layout Features:
 * - Centered section header with title and description
 * - Responsive card grid with gap spacing
 * - Individual cards with consistent padding
 * - Flexible content flow with auto-height cards
 * 
 * Styling:
 * - Monketer purple theming
 * - Consistent typography scale
 * - Subtle shadows and borders
 * - Gradient effects for avatars
 * - Quote marks using CSS pseudo-elements
 * 
 * Dependencies:
 * - No external component dependencies
 * - Uses Tailwind CSS for styling
 * - Static testimonial data array
 */
const TestimonialsSection = () => {
  return (
    <div className="bg-monketer-purple-light py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header with title and description */}
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Loved by marketers worldwide
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Don't just take our word for it — hear from the people who've transformed their email marketing with Monketer.
          </p>
        </div>

        {/* Testimonials grid container */}
        <div className="mx-auto mt-16 flow-root max-w-2xl sm:mt-20 lg:mx-0 lg:max-w-none">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
                {/* Testimonial content with decorative quotes */}
                <p className="text-lg leading-relaxed before:content-[open-quote] after:content-[close-quote] before:text-monketer-purple before:text-xl after:text-monketer-purple after:text-xl">
                  {testimonial.content}
                </p>
                {/* Author information with gradient avatar */}
                <div className="mt-6 flex items-center gap-x-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-monketer-purple to-monketer-purple-dark flex items-center justify-center text-white text-lg font-medium">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold leading-6 tracking-tight text-gray-900">{testimonial.name}</h3>
                    <p className="text-sm text-gray-600">{testimonial.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestimonialsSection;
