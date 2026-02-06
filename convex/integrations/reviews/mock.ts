import type {
  ReviewsAdapter,
  Review,
  AggregateRating,
  PostResponseResult,
} from "./interface";

function delay(min = 80, max = 200): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((r) => setTimeout(r, ms));
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 14);
}

// ---------------------------------------------------------------------------
// Realistic dental review text
// ---------------------------------------------------------------------------
const FIVE_STAR_REVIEWS = [
  "Dr. Hartwell and her team are wonderful! The office is clean, the staff is friendly, and I never have to wait long. Highly recommend Canopy Dental to anyone looking for a new dentist.",
  "Best dental experience I have ever had. Lisa the hygienist was incredibly gentle and thorough. No pain during the cleaning at all. Five stars!",
  "I had a crown done last week and it was seamless. Dr. Okafor explained every step, the numbing was painless, and the crown fits perfectly. Great office.",
  "My kids actually look forward to going to the dentist now! The whole team at Canopy is patient, kind, and makes the experience fun. Thank you!",
  "Quick and easy check-up. The front desk staff got me in right on time. Digital X-rays were fast. Dr. Hartwell found a small cavity and we already have a plan. Professional all around.",
  "Moved to Austin last year and needed a new dentist. Canopy Dental was recommended by a coworker and they did not disappoint. Modern office, great technology, and genuinely caring staff.",
  "Had an emergency toothache and they fit me in same day. Root canal with Dr. Okafor was painless. I can not believe how smooth it went. So grateful.",
];

const FOUR_STAR_REVIEWS = [
  "Good experience overall. Clean office, friendly staff. Only reason it is not five stars is the wait was about 15 minutes past my appointment time. Still a great practice though.",
  "Dr. Hartwell is excellent. Very thorough and takes time to explain everything. The only downside is parking can be a bit tricky at their location.",
  "Had two fillings done and they look great. Virtually no pain. The only thing I would change is they could send appointment reminders a bit earlier. Otherwise terrific.",
  "Rachel did my cleaning and she was wonderful. Found out I need a deep cleaning on one side which was a surprise, but they were transparent about the costs.",
];

const THREE_STAR_REVIEWS = [
  "The dental work itself was fine, but the billing process was confusing. I got a bill for more than expected and had to call twice to get it sorted out.",
  "Average experience. The office is nice and clean but felt a bit rushed during my appointment. Wish they had spent more time answering my questions.",
  "They do good work but the scheduling is frustrating. Had to reschedule twice because they called to move my appointment.",
];

const TWO_STAR_REVIEWS = [
  "Was told my insurance covered a procedure, then got a surprise bill for $400. The front desk could not explain why. Still waiting for resolution.",
  "Long wait times. My appointment was at 2pm and I did not get seen until 2:45. When I finally was seen, the hygienist was nice but it felt rushed.",
];

const ONE_STAR_REVIEWS = [
  "Terrible billing experience. Was charged for a procedure I did not authorize. Have been trying to get a refund for three weeks with no resolution. Very frustrating.",
  "Left after waiting over an hour past my appointment time with no update from the front desk. They did not seem to care. Will not be coming back.",
];

const REVIEWER_NAMES = [
  "Amanda S.", "Brian T.", "Carla M.", "Daniel W.", "Elena R.",
  "Frank P.", "Grace L.", "Henry K.", "Isabella F.", "Jason D.",
  "Katherine H.", "Luis G.", "Megan O.", "Nathan B.", "Olivia C.",
  "Patrick J.", "Quinn A.", "Rachel N.", "Steven V.", "Tanya E.",
  "Victor M.", "Wendy Z.", "Xavier Y.", "Yolanda P.", "Zach R.",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateReviews(count: number, since?: Date): Review[] {
  const reviews: Review[] = [];
  const now = Date.now();
  const sinceTs = since?.getTime() ?? now - 90 * 24 * 60 * 60 * 1000; // default 90 days

  for (let i = 0; i < count; i++) {
    // Weighted distribution: mostly 4-5 stars
    const rand = Math.random();
    let rating: number;
    let textPool: string[];
    if (rand < 0.55) {
      rating = 5;
      textPool = FIVE_STAR_REVIEWS;
    } else if (rand < 0.80) {
      rating = 4;
      textPool = FOUR_STAR_REVIEWS;
    } else if (rand < 0.90) {
      rating = 3;
      textPool = THREE_STAR_REVIEWS;
    } else if (rand < 0.96) {
      rating = 2;
      textPool = TWO_STAR_REVIEWS;
    } else {
      rating = 1;
      textPool = ONE_STAR_REVIEWS;
    }

    const publishedAt = sinceTs + Math.floor(Math.random() * (now - sinceTs));

    reviews.push({
      reviewId: `goog-${randomId()}`,
      source: Math.random() > 0.1 ? "google" : "yelp",
      reviewerName: pickRandom(REVIEWER_NAMES),
      rating,
      text: pickRandom(textPool),
      publishedAt,
    });
  }

  return reviews.sort((a, b) => b.publishedAt - a.publishedAt);
}

// Persistent store for posted responses
const responseStore = new Map<string, { content: string; postedAt: number }>();

// ---------------------------------------------------------------------------
// Mock implementation
// ---------------------------------------------------------------------------
export class MockReviewsAdapter implements ReviewsAdapter {
  async fetchReviews(since?: Date): Promise<Review[]> {
    await delay(100, 250);

    // Generate 8-20 reviews
    const count = 8 + Math.floor(Math.random() * 13);
    const reviews = generateReviews(count, since);

    // Attach any posted responses
    return reviews.map((r) => {
      const response = responseStore.get(r.reviewId);
      if (response) {
        return {
          ...r,
          responseText: response.content,
          responsePostedAt: response.postedAt,
        };
      }
      return r;
    });
  }

  async postResponse(reviewId: string, content: string): Promise<PostResponseResult> {
    await delay(100, 300);

    // Simulate ~2% failure
    if (Math.random() < 0.02) {
      return {
        success: false,
        errorMessage: "Failed to post response. Google API rate limit exceeded. Try again later.",
      };
    }

    const postedAt = Date.now();
    responseStore.set(reviewId, { content, postedAt });

    return {
      success: true,
      postedAt,
    };
  }

  async getAggregateRating(): Promise<AggregateRating> {
    await delay(50, 120);

    // Realistic dental practice ratings
    const star5 = 85 + Math.floor(Math.random() * 20);
    const star4 = 25 + Math.floor(Math.random() * 15);
    const star3 = 8 + Math.floor(Math.random() * 7);
    const star2 = 3 + Math.floor(Math.random() * 4);
    const star1 = 2 + Math.floor(Math.random() * 3);
    const total = star1 + star2 + star3 + star4 + star5;
    const weightedSum = star1 * 1 + star2 * 2 + star3 * 3 + star4 * 4 + star5 * 5;
    const rating = Math.round((weightedSum / total) * 10) / 10;

    return {
      rating,
      count: total,
      distribution: {
        star1,
        star2,
        star3,
        star4,
        star5,
      },
    };
  }
}
