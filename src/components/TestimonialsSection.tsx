
const testimonials = [
  {
    content: "Emailore transformed the way we handle email marketing. Our engagement rates have never been higher!",
    author: "Sarah Johnson",
    role: "Marketing Director, TechCorp",
  },
  {
    content: "The time saved using Emailore's templates and automation tools has been incredible. What used to take days now takes hours.",
    author: "Michael Chen",
    role: "Founder, StartupLabs",
  },
  {
    content: "The analytics provided by Emailore gave us insights we never had before. We've completely rethought our email strategy.",
    author: "Jessica Williams",
    role: "Growth Specialist, InnovateNow",
  },
];

const TestimonialsSection = () => {
  return (
    <div className="bg-emailore-purple-light py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Loved by marketers everywhere
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Don't just take our word for it — hear from the people who've transformed their email marketing with Emailore.
          </p>
        </div>
        
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:gap-8 lg:max-w-none lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="flex flex-col justify-between bg-white rounded-2xl shadow-sm p-6 ring-1 ring-gray-200 hover:shadow-md transition-shadow duration-300"
            >
              <blockquote className="text-gray-700">
                <p className="text-lg leading-relaxed before:content-['\"\'] after:content-['\"\'] before:text-emailore-purple before:text-xl after:text-emailore-purple after:text-xl">
                  {testimonial.content}
                </p>
              </blockquote>
              <div className="mt-6 flex items-center">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-emailore-purple to-emailore-purple-dark flex items-center justify-center text-white text-lg font-medium">
                  {testimonial.author.charAt(0)}
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-900">{testimonial.author}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestimonialsSection;
