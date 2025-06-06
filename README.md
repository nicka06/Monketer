# Welcome to the Monketer README, a hackclub neighborhood project. Please read through the entire README if you are going to use it or are simply reviewing it. 


## Current State

There are two branches for this current project. The first (main) branch is the "AI email generator". The concept is fairly simple. Allow users to describe what they want their emails to look like via text and output that in html emails. This part of the project is ~90% complete. Besides the manual editor and tweaking the prompts to generate better looking emails, this project is finished. But, I didn't stop there. I wanted to build a full marketing solution. Something that would democratize marketing, allowing all business owners to have world class email marketing no matter their skill level. AND THUS... I've built an onboarding page :((. No seriously, I've only been able to build the onboarding section of the website so far BUT there's a lot more in store. So, I'll go through explaining what's been done in detail about both branches and then I'll explain where I'd like to go with this in the future. And, if you're reviewing this project, please stick around to the end to see my hours breakdown to make your life easier :))). 

### 1. AI Email Generator 

####   What I've done so far (Some of these things are only in the main branch)
* Created a homepage that prompts the user to describe their email. Also has mock customer reviews, testimonials, product descriptions, etc.
* Built out the whole auth (sign in, sign up, actually haven't finished forgot password yet)
* Created a dashboard showing the user all the projects that they are working on. This lets them jump into any project or edit the name of the project from the dashboard.
* (Here's where the real magic starts)
* Created a chat with stored messages that 1) Asks users about their prompts to really understand what they are trying to build, 2) Creates a summary based on that which will be used for the email generation prompt, 3) Has a context window of the last three messages to understand what the user may be referencing. 
* An email generation prompt that takes the prompt and creates an html email from it WITH a seperate field that has a json breaking down each component to allow users to accept or decline certain elements AND edit particular elements through text prompting.
* I've begun building a manual editor that allows users to make small changes to the elements without having to prompt.
* Users can send their emails as tests to themselves to view their work in real life. 
* Probably a lot of other cool stuff that I'm not mentioning because I'm rushing and I spent a LOT of time working on it. (Hardest part was the pending changes without a doubt).

####   What I'll do in the future.
Please reference the Full marketing solution. While I do plan to make changes to the AI email generator, these will be within the Full Marketing Solution branch of the project and will be a part of that vision. 

It's also worth mentioning that I created an AI powered blog creator agent because I was bored one day. Basically, it uses perplexity to ask if there's any breaking news in XYZ subject and if it comes back true, it would then do all of the research on that breaking news and write a quick blog. Then, it would send that blog to you via telegram and you could either accept or decline and if you accepted, it would publish that blog on your website and if not, it wouldn't. While it is complete, the blogs are terrible (because they're written by AI), so I have plans in the future to change it so that it just gives you all of hte informaiton and suggests a format and then the actual individual writes the blog. Could be fun but I need to finish working on the Full Marketing Solution. 

### 2. Full Marketing Solution

####   What I've done so far.
* Created a homepage and subsequent pages for the user to explain information about their current business and what they look to achieve through this email marketing campaigns
* Again, I created a full auth system with sign in and sign up and sign out.
* Created a list of different emails a user may want (for example a welcome email, abandoned cart email, weekly marketing email, etc) and allowed the user to choose what emails they may want.
* Created a page for a user to explain what website hosting service they use (which will come in useful later).
* Ask the user what their domain for their website is so that I can query a db that has all of the domains and their subsequent providers because then it takes that users domain provider and in the next page...
* Creates a popup with that users domain provider and all of the dns records that they will need to put in for that provider and explains how to input those dns records for their particular provider (I need to create a more personalized approach to this but that will just take more man hours to create all of the instructions for each provider).
* Here's how the dns record generation works. The user inputs their domain, it takes that and creates the first few dns records just based on the domain. For example, it needs an mx record for their domain that routes to our server. Then, it takes the domain, sends it to my mail server which is being hosted on AWS, creates a dkim key (private and public), saves that private key on that server and sends back the public key back to supabase where it is stored and then displayed to the user.
* Then after all of that, it allows the user to test whether the dns records are visible by just clicking a button.
* And if the dns records aren't visible, it adds a bar to the top of the screen explaining that.
* And then once you've done your dns records, a pixel is generated on the next screen that you will be asked to input into your website.
* Once you input the pixel into your site, you can click verify to see if you've done this properly.
* All of this information is saved and stored in supabase and then the user will be prompted to choose what billing service they would like to use via stripe. (theres a free, pro, and premium. It's just a concept right now so it's not really to make money, just to prove I can build this out).

####   What my next steps are (I could be missing some because there are so many).
* Setup AWS SES to allow users to actually send the emails out.
* Improve the UI so it's not just embedded images in the background.
* Create a more "personalized" experience for each domain provider when setting up dns records
* Create an automated way that the pixel is first initialized. Right now, a user has to go load their website which could be confusing for some. I need to almost call the website in the backend somehow to try and initalize the pixel to get it to register and verify.
* Spend many hours working on the tracking of emails so that I can return data about what my users customers did with teh emails and whether they even got delivered or not.
* Create an initiation process for a user to setup all of the emails and customize them. There will be a prompt that first creates emails based on their responses in the onboarding but then they will be able to go in and delete/add/edit those emails.
* Create a way for a user to easily explain when they want emails to be sent. (I'm thinking about creating a popup that allows the user to easily show if (they click on a button) is clicked, then this email is sent or if they choose a chain of events or even if a user is on a page. I need to think about how to make this intuitive.
* I don't have the full vision for this but allow the user to go in and view and edit all of the informtion about the emails.
* Create a learning algorithim to update the times the emails are sent, content that they are sent with, subject lines, etc.
* A lot more that I don't remember or don't have time to write down. This will be a long project!


## Want to use this project?

First, you have to understand that this project is very much "in the works" but I did just deploy it to monketer.com if you would like to view it. Additionally, you could clone this repository and make your own or juts branch off of it and create new cool things. You'll need to setup all of the supabase, all of the environmental variables, and more but if you want to do this and have questions, feel free to reach out to me via slack.

## Hours breakdown and helping you verify.

For the first ~45 hours or so, I didn't do devlogs (because there were none yet and then for a while, I thought they were supposed to be done only when you finished your project). You should still be able to follow what I was working on through commits. If you have questions about what I did or need more verification, please reach out to me at any point. Then, I started to do the standard devlogs (and I started committing more because you posted in slack. I didn't know commits were a way you checked before this). So, you should be able to follow there. Then, when I was setting up the AWS server, I used my stopwatch times and created the devlogs through the stopwatch rather than the traditional devlogs. Also, during this entire process, I streamed my work the whole time. There's approximately 48 hours of stream time that I show what I'm working on. https://www.youtube.com/@nickawork I do my best to have a personal stopwatch that I start and stop when I'm diligently working and only use that for the stopwatch time. You can see that in the stream and I'm also to share with you my personal log and where it all came from. Then, just over the past two devlogs ~8 hours, I've posted two more devlogs sharing what I've done. I hope this is enough to get the hours that I've been working on and if there's any confusion or anything I can do to help the reviewers verify, please let me know. Thank you and I look forward to seeing you all in San Fransisico!!! 

