-- ============================================
-- Add payment & course columns to students table
-- Run this in Supabase SQL Editor
-- ============================================

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS purchased_courses  TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS payment_status     TEXT    DEFAULT 'free'
    CHECK (payment_status IN ('free','perf_only','inf_only','both')),
  ADD COLUMN IF NOT EXISTS razorpay_order_id  TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- ============================================
-- MCQ questions table
-- ============================================
CREATE TABLE IF NOT EXISTS mcq_questions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  track        TEXT NOT NULL CHECK (track IN ('performance','influencer')),
  level        INT  NOT NULL CHECK (level BETWEEN 2 AND 5),
  question     TEXT NOT NULL,
  option_a     TEXT NOT NULL,
  option_b     TEXT NOT NULL,
  option_c     TEXT NOT NULL,
  option_d     TEXT NOT NULL,
  correct      TEXT NOT NULL CHECK (correct IN ('a','b','c','d')),
  explanation  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mcq_questions ENABLE ROW LEVEL SECURITY;
-- Students can read questions, not write
CREATE POLICY "students_read_questions" ON mcq_questions
  FOR SELECT USING (true);

-- ============================================
-- MCQ attempts table — tracks test results
-- ============================================
CREATE TABLE IF NOT EXISTS mcq_attempts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  track        TEXT NOT NULL,
  level        INT  NOT NULL,
  score        INT  NOT NULL,
  total        INT  NOT NULL,
  passed       BOOLEAN NOT NULL,
  answers      JSONB,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mcq_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_attempts" ON mcq_attempts
  FOR ALL USING (
    student_id IN (SELECT id FROM students WHERE auth_id = auth.uid())
  );

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_mcq_attempts_student ON mcq_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_mcq_questions_level  ON mcq_questions(track, level);

-- ============================================
-- Seed MCQ questions — Performance Marketing
-- Level 2: Signal Spotter (15 questions)
-- ============================================
INSERT INTO mcq_questions (track, level, question, option_a, option_b, option_c, option_d, correct, explanation) VALUES

('performance', 2, 'What does CPM stand for in digital advertising?',
 'Cost Per Message', 'Cost Per Mille (per 1000 impressions)', 'Click Per Metric', 'Conversion Per Mille',
 'b', 'CPM = Cost Per Mille. Mille is Latin for 1000. It measures the cost of 1000 ad impressions.'),

('performance', 2, 'A marketing funnel has three stages. Which is the correct order?',
 'Conversion → Consideration → Awareness', 'Awareness → Consideration → Conversion',
 'Consideration → Awareness → Conversion', 'Conversion → Awareness → Consideration',
 'b', 'TOFU (Awareness) → MOFU (Consideration) → BOFU (Conversion) is the standard funnel order.'),

('performance', 2, 'What does CTR stand for?',
 'Cost To Reach', 'Click Through Rate', 'Conversion Tracking Ratio', 'Customer Targeting Rate',
 'b', 'CTR = Clicks ÷ Impressions × 100. It measures how often people click your ad after seeing it.'),

('performance', 2, 'If your ad gets 500 clicks from 10,000 impressions, what is your CTR?',
 '0.5%', '5%', '50%', '500%',
 'b', 'CTR = 500 ÷ 10,000 × 100 = 5%.'),

('performance', 2, 'Which metric tells you the average cost you pay each time someone clicks your ad?',
 'CPM', 'CTR', 'CPC', 'ROAS',
 'c', 'CPC = Cost Per Click. It is calculated as Total Spend ÷ Total Clicks.'),

('performance', 2, 'What is the top of the marketing funnel (TOFU) primarily focused on?',
 'Getting sales', 'Building brand awareness and reach', 'Retargeting existing customers', 'Reducing ad spend',
 'b', 'TOFU is awareness — the goal is reaching new people and making them aware of your brand.'),

('performance', 2, 'Which of the following is a KPI for an e-commerce brand running performance ads?',
 'Number of employees', 'Return on Ad Spend (ROAS)', 'Office location', 'Founder age',
 'b', 'KPIs (Key Performance Indicators) measure business outcomes. ROAS directly measures ad effectiveness.'),

('performance', 2, 'What does CPA stand for?',
 'Cost Per Advertiser', 'Cost Per Action (or Acquisition)', 'Click Per Ad', 'Conversion Per Audience',
 'b', 'CPA = Cost Per Action. It tells you how much you spend on average to get one conversion.'),

('performance', 2, 'A brand spends ₹20,000 on ads and gets 100 sales. What is the CPA?',
 '₹20', '₹200', '₹2,000', '₹500',
 'b', 'CPA = ₹20,000 ÷ 100 = ₹200 per sale.'),

('performance', 2, 'Which stage of the funnel is retargeting most effective for?',
 'Awareness (TOFU)', 'Consideration and Conversion (MOFU/BOFU)', 'Pre-funnel', 'Post-sale only',
 'b', 'Retargeting works best on warm audiences — people who already visited your site or engaged with your brand.'),

('performance', 2, 'What does "reach" mean in a digital advertising campaign?',
 'The number of times an ad was clicked', 'The number of unique people who saw your ad',
 'The total number of ad impressions', 'The geographic area targeted',
 'b', 'Reach = unique users who saw your ad. Impressions can count the same person multiple times.'),

('performance', 2, 'If your campaign goal is brand awareness, which metric should you prioritise?',
 'CPA', 'ROAS', 'CPM and Reach', 'CPC',
 'c', 'Brand awareness campaigns optimise for reach and impressions. CPM (cost per 1000 impressions) is the right metric.'),

('performance', 2, 'What does "conversion" mean in performance marketing?',
 'A user seeing your ad', 'A desired action taken by a user (purchase, sign-up, etc.)', 'Changing your ad creative', 'Converting currency',
 'b', 'A conversion is any action you want the user to take — purchase, form fill, app install, etc.'),

('performance', 2, 'Which of these is a vanity metric — looks good but does not directly indicate business success?',
 'Revenue', 'Likes and followers', 'ROAS', 'CPA',
 'b', 'Likes and followers feel good but do not directly drive revenue. Focus on metrics tied to business outcomes.'),

('performance', 2, 'What is the purpose of A/B testing in digital marketing?',
 'To test two different products', 'To compare two versions of an ad to see which performs better',
 'To split the advertising budget', 'To test ads on two different platforms',
 'b', 'A/B testing shows two versions to different audience segments to find the better-performing creative, copy, or audience.');

-- ============================================
-- Level 3: Campaign Builder (15 questions)
-- ============================================
INSERT INTO mcq_questions (track, level, question, option_a, option_b, option_c, option_d, correct, explanation) VALUES

('performance', 3, 'On Meta Ads, which campaign objective should you choose if you want to drive purchases on your website?',
 'Brand Awareness', 'Traffic', 'Sales (Conversions)', 'Reach',
 'c', 'The Sales objective optimises for conversions. Meta shows your ad to people most likely to purchase.'),

('performance', 3, 'What is a Lookalike Audience on Meta?',
 'People who look like your ad creative', 'People similar to your existing customers or website visitors',
 'A default audience Meta creates for all advertisers', 'An audience based on geographic location',
 'b', 'Lookalike Audiences find new users who share characteristics with your source audience — great for scaling.'),

('performance', 3, 'Which Meta Ads placement typically gives the highest engagement for e-commerce?',
 'Facebook Marketplace', 'Instagram Stories and Reels', 'Facebook Groups', 'Messenger',
 'b', 'Instagram Stories and Reels drive high engagement for e-commerce due to visual format and high user intent.'),

('performance', 3, 'In Google Ads, what is a "keyword match type"?',
 'The visual style of your ad', 'How closely a search query must match your keyword to trigger your ad',
 'The geographic area your ad targets', 'The time your ad appears',
 'b', 'Match types (Broad, Phrase, Exact) control how strictly Google matches search terms to your keywords.'),

('performance', 3, 'Which Google Ads match type gives you the most control but least reach?',
 'Broad Match', 'Modified Broad Match', 'Phrase Match', 'Exact Match',
 'd', 'Exact Match only shows your ad when the search query matches your keyword exactly — highest control, lowest volume.'),

('performance', 3, 'What is a Quality Score in Google Ads?',
 'The visual quality of your ad image', 'A score (1-10) measuring ad relevance, expected CTR, and landing page experience',
 'Your total ad budget score', 'A competitor ranking',
 'b', 'Quality Score directly affects your Ad Rank and CPC. Higher Quality Score = lower cost and better placement.'),

('performance', 3, 'What does "ad fatigue" mean?',
 'Your campaign budget running out', 'Audience performance declining because people have seen your ad too many times',
 'Your ad account getting suspended', 'A slow-loading landing page',
 'b', 'Ad fatigue happens when the same audience sees your ad repeatedly, leading to declining CTR and rising CPM.'),

('performance', 3, 'Which bidding strategy should you use if you want to maximise conversions within a fixed daily budget?',
 'Manual CPC', 'Target Impression Share', 'Maximise Conversions (automated bidding)', 'CPM bidding',
 'c', 'Maximise Conversions lets Google automatically set bids to get the most conversions for your budget.'),

('performance', 3, 'What is frequency in Meta advertising?',
 'How often you post on Facebook', 'The average number of times one person sees your ad',
 'The number of ads in your campaign', 'How frequently you change your creative',
 'b', 'Frequency = Impressions ÷ Reach. High frequency (above 3-4) often signals ad fatigue.'),

('performance', 3, 'A campaign has a ₹500 daily budget and runs for 30 days. What is the total spend?',
 '₹500', '₹1,500', '₹15,000', '₹5,000',
 'c', '₹500 × 30 days = ₹15,000 total spend.'),

('performance', 3, 'What is a landing page in the context of a paid campaign?',
 'The home page of your website', 'The specific page a user lands on after clicking your ad',
 'Your Google My Business page', 'The ad creative itself',
 'b', 'A landing page is purpose-built to convert visitors from a specific campaign — it should match the ad exactly.'),

('performance', 3, 'Which of the following best describes "remarketing"?',
 'Marketing your product again after rebranding', 'Showing ads to people who previously visited your website or app',
 'Sending emails to new leads', 'Running the same ad on multiple platforms',
 'b', 'Remarketing (retargeting) re-engages warm audiences who already showed interest in your product.'),

('performance', 3, 'In Meta Ads, what is the difference between a campaign, ad set, and ad?',
 'They are all the same thing', 'Campaign = objective, Ad Set = audience + budget + placement, Ad = creative',
 'Campaign = creative, Ad Set = objective, Ad = budget', 'Campaign = budget, Ad Set = creative, Ad = audience',
 'b', 'The Meta Ads structure is hierarchical: Campaign (objective) > Ad Set (targeting + budget) > Ad (creative).'),

('performance', 3, 'What should you do if your CPL (Cost Per Lead) is too high?',
 'Increase the budget immediately', 'Test new audiences, improve ad creative, or optimise the landing page',
 'Pause all campaigns', 'Switch to a different platform',
 'b', 'High CPL means the campaign is inefficient. Test different variables — audience, creative, copy, landing page.'),

('performance', 3, 'What is the recommended minimum daily budget to effectively test a Meta Ads campaign in India?',
 '₹10', '₹50–₹100', '₹5,000', '₹50,000',
 'b', 'You need enough budget for Meta to exit the learning phase. ₹50–₹100/day is a practical minimum for testing in India.');

-- ============================================
-- Level 4: Growth Operator (15 questions)
-- Influencer Marketing track
-- ============================================
INSERT INTO mcq_questions (track, level, question, option_a, option_b, option_c, option_d, correct, explanation) VALUES

('influencer', 4, 'What defines a nano influencer?',
 '1M+ followers', '100K–1M followers', '10K–100K followers', '1K–10K followers',
 'd', 'Nano influencers have 1K–10K followers. They have the highest engagement rates and most authentic connections.'),

('influencer', 4, 'Which influencer tier typically has the highest engagement rate?',
 'Mega influencers (1M+)', 'Macro influencers (100K–1M)', 'Micro influencers (10K–100K)', 'Nano influencers (1K–10K)',
 'd', 'Nano influencers have engagement rates of 5–8% vs 1–2% for mega influencers. Smaller audience = deeper trust.'),

('influencer', 4, 'What is an influencer brief?',
 'A short bio of the influencer', 'A document outlining campaign objectives, deliverables, dos and donts for the creator',
 'A payment receipt', 'A contract signed by both parties',
 'b', 'A brief is the creative blueprint for the collaboration — it aligns the creator with your campaign goals.'),

('influencer', 4, 'What does EMV (Earned Media Value) measure in influencer marketing?',
 'The total ad spend on influencer campaigns', 'The estimated PR value of organic content generated by influencers',
 'The engagement rate of a post', 'The number of followers an influencer has',
 'b', 'EMV quantifies the value of organic content. It estimates what equivalent paid media would have cost.'),

('influencer', 4, 'A brand wants to drive product sales urgently. Which influencer type is most effective?',
 'Mega influencers for mass awareness', 'Micro and nano influencers with high trust in the niche',
 'Any influencer with 500K+ followers', 'Only celebrity influencers',
 'b', 'For direct sales, trust and niche relevance matter more than reach. Micro and nano convert better.'),

('influencer', 4, 'What is a "gifting" collaboration?',
 'Sending money to the influencer as a gift', 'Sending free products to an influencer in exchange for content — no guaranteed post',
 'A paid partnership disguised as organic', 'A prize giveaway run by the influencer',
 'b', 'Gifting = no payment, no guaranteed post. The influencer may or may not create content. Lower risk, lower control.'),

('influencer', 4, 'What should you always disclose in an influencer post in India?',
 'Nothing — organic posts do not need disclosure', 'Paid partnerships must be disclosed with #ad, #sponsored, or #collab',
 'Only mega influencer posts need disclosure', 'Disclosure is optional in India',
 'b', 'ASCI (Advertising Standards Council of India) mandates disclosure for all paid collaborations.'),

('influencer', 4, 'What is reach in the context of an influencer campaign?',
 'The number of posts the influencer makes', 'The total number of unique users who could see the content',
 'The engagement rate on posts', 'The number of followers gained',
 'b', 'Reach = unique users exposed to the content. Different from impressions which count repeat views.'),

('influencer', 4, 'Which metric best indicates that an influencer campaign drove actual sales?',
 'Total impressions', 'Number of comments', 'Promo code usage or tracked link clicks', 'Follower growth',
 'c', 'Promo codes and UTM-tracked links directly attribute sales to specific influencers — the most reliable metric.'),

('influencer', 4, 'What is an exclusivity clause in an influencer contract?',
 'A clause giving the influencer exclusive rights to your brand', 'A restriction preventing the influencer from working with competitors for a set period',
 'A guarantee of future campaigns', 'A non-disclosure agreement',
 'b', 'Exclusivity protects your brand from a competitor using the same creator immediately after your campaign.'),

('influencer', 4, 'A D2C skincare brand has ₹50,000 budget. What is the best influencer strategy?',
 '1 mega influencer post', '5 macro influencer posts', '10-15 nano/micro influencer posts',
 'Only Instagram paid ads',
 'c', 'Skincare requires trust. Multiple nano/micro creators in the beauty niche deliver better ROI than one mega post.'),

('influencer', 4, 'What does UGC stand for and why does it matter?',
 'User Generated Content — authentic content made by real customers or creators',
 'Universal Growth Chart — a metric for follower growth',
 'Unique Geographic Campaign — location-based targeting',
 'User Growth Coefficient — a formula for follower prediction',
 'a', 'UGC is authentic content created by real users or creators. It builds trust and can be repurposed for paid ads.'),

('influencer', 4, 'What is the key difference between an influencer and a brand ambassador?',
 'There is no difference', 'An influencer does one-off campaigns; a brand ambassador has an ongoing long-term relationship',
 'Ambassadors are always celebrities', 'Influencers get paid more',
 'b', 'Brand ambassadors represent your brand over time — multiple campaigns, deeper integration, stronger association.'),

('influencer', 4, 'Which platform is currently best for influencer marketing targeting Gen-Z in India?',
 'Facebook', 'LinkedIn', 'Instagram Reels and YouTube Shorts', 'Twitter',
 'c', 'Instagram Reels and YouTube Shorts dominate Gen-Z consumption in India — short video format drives discovery.'),

('influencer', 4, 'What is the ideal way to measure the success of an influencer awareness campaign?',
 'Only by sales generated', 'Reach, impressions, brand search lift, and sentiment analysis',
 'Number of influencer followers', 'Number of DMs received',
 'b', 'Awareness campaigns are not optimised for direct sales. Measure reach, brand recall, and search volume uplift instead.');

-- Level 5 questions (Viral Architect - influencer)
INSERT INTO mcq_questions (track, level, question, option_a, option_b, option_c, option_d, correct, explanation) VALUES

('influencer', 5, 'What makes a piece of content "viral"?',
 'High production budget', 'High shareability driven by emotion, relatability, or novelty', 'Celebrity involvement', 'Paid promotion only',
 'b', 'Viral content spreads because people want to share it. Emotion (joy, surprise, outrage) and relatability are the core drivers.'),

('influencer', 5, 'What is influencer marketing attribution and why is it hard?',
 'Easy — just count sales from the influencer link', 'Difficult because customers may see multiple touchpoints before buying, making it hard to credit one creator',
 'Not important for influencer campaigns', 'Only relevant for mega influencers',
 'b', 'Multi-touch attribution is the real challenge — a customer might see 5 influencer posts before buying from the 6th.'),

('influencer', 5, 'What is a UTM parameter and how does it help influencer campaigns?',
 'A type of influencer contract', 'A tracking code added to URLs that identifies which influencer or campaign drove traffic',
 'A Meta Ads feature', 'A payment method for influencers',
 'b', 'UTM parameters let you track exactly which influencer or post drove clicks and conversions in Google Analytics.'),

('influencer', 5, 'A campaign has 10 influencers posting on the same day. What is the risk?',
 'Too much reach', 'Content looks coordinated and inauthentic — audiences may identify it as paid and disengage',
 'Platform algorithm penalises bulk posts', 'The brand gets too many orders',
 'b', 'Simultaneous posting by multiple creators on the same product looks orchestrated. Stagger posts over 2-3 weeks for organic feel.'),

('influencer', 5, 'What does "dark posting" mean in influencer marketing?',
 'Posting at night for better reach', 'Using influencer content as paid ads without it appearing on their public feed',
 'Deleting posts after 24 hours', 'Posting without hashtags',
 'b', 'Dark posting (whitelisting) lets brands run influencer content as ads without it living on the creator profile — more control, wider reach.'),

('influencer', 5, 'How do you calculate the ROI of an influencer campaign?',
 'ROI = Followers gained ÷ Campaign cost', 'ROI = (Revenue generated – Campaign cost) ÷ Campaign cost × 100',
 'ROI = Total impressions × Engagement rate', 'ROI cannot be calculated for influencer marketing',
 'b', 'Standard ROI formula applies: (Revenue – Cost) ÷ Cost × 100. Track revenue via promo codes or UTM links.'),

('influencer', 5, 'What is "influencer fraud" and how do you detect it?',
 'When influencers charge too much', 'When influencers have fake or bought followers — detect via engagement rate vs follower ratio and audience quality tools',
 'When influencers post competitor content', 'When influencers miss deadlines',
 'b', 'Fake followers are a major problem. A creator with 100K followers but 200 likes per post has a 0.2% engagement rate — a red flag.'),

('influencer', 5, 'Which of the following is NOT a good viral campaign trigger?',
 'A challenge that is easy to participate in', 'Emotional storytelling', 'Overly complex product demonstrations', 'Humour and relatability',
 'c', 'Complex content does not travel. Viral campaigns need simple, participatory, emotionally resonant concepts.'),

('influencer', 5, 'What is creator whitelisting?',
 'Blocking certain creators from your campaign', 'Getting permission to run paid ads from a creator's account, reaching their audience and beyond',
 'A way to verify creator identity', 'A type of exclusivity clause',
 'b', 'Whitelisting lets you run ads from the influencer's handle — it uses their authentic voice while giving you full targeting control.'),

('influencer', 5, 'A brand wants to go viral on a ₹0 budget. What is the best strategy?',
 'Run expensive TV ads', 'Create highly shareable content, brief micro creators on gifting only, and seed in relevant communities',
 'Post on all platforms daily', 'Partner with a celebrity',
 'b', 'Zero-budget virality requires: compelling content concept + seeding with nano/micro creators on gifting + community distribution.'),

('influencer', 5, 'What is the best way to brief an influencer for maximum creative output?',
 'Send a very detailed script and make them read it word for word', 'Give clear campaign goals, key messages, and mandatory disclosures — but let their creative voice lead',
 'Let them post whatever they want with no guidance', 'Only share the product and nothing else',
 'b', 'The best influencer content sounds like the creator, not the brand. Brief on objectives and guardrails, not scripts.'),

('influencer', 5, 'What does "content amplification" mean in influencer strategy?',
 'Making the video louder', 'Boosting top-performing organic influencer content with paid media to extend its reach',
 'Posting the same content multiple times', 'Adding subtitles to influencer videos',
 'b', 'Amplification = take what organically resonated and put paid spend behind it. Organic proof + paid reach = maximum impact.'),

('influencer', 5, 'Which of the following best describes "micro-influencer marketing at scale"?',
 'Hiring one micro influencer for a long campaign', 'Working with 50–100 micro influencers simultaneously for wide authentic coverage',
 'Giving micro influencers macro influencer budgets', 'Only working with influencers in one city',
 'b', 'Micro-at-scale means many authentic voices across niches simultaneously — the coverage of a mega influencer with the trust of micro ones.'),

('influencer', 5, 'What metric would you use to compare efficiency across different influencers?',
 'Total followers', 'CPV (Cost Per View) or CPE (Cost Per Engagement)', 'Number of posts', 'Profile aesthetics',
 'b', 'CPV and CPE normalise performance across creators of different sizes — the only fair way to compare a 10K vs 500K creator.'),

('influencer', 5, 'After a successful influencer campaign, what should you do with the content?',
 'Delete it once the campaign ends', 'Repurpose it — use as paid ads, website testimonials, email campaigns, and social organic posts',
 'Keep it exclusive to the influencer platform', 'Archive it for 3 years',
 'b', 'Influencer content is a brand asset. Repurposing it across channels multiplies the ROI of the original investment.');
