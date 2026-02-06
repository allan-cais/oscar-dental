// Reviews Adapter Interface
// Primary provider: Google Business Profile API
// Fetch reviews, post responses, aggregate ratings

export interface Review {
  reviewId: string;
  source: "google" | "yelp" | "healthgrades" | "internal";
  reviewerName: string;
  rating: number; // 1-5
  text?: string;
  publishedAt: number;
  updatedAt?: number;
  responseText?: string;
  responsePostedAt?: number;
}

export interface AggregateRating {
  rating: number; // e.g., 4.6
  count: number;
  distribution: {
    star1: number;
    star2: number;
    star3: number;
    star4: number;
    star5: number;
  };
}

export interface PostResponseResult {
  success: boolean;
  postedAt?: number;
  errorMessage?: string;
}

export interface ReviewsAdapter {
  // Fetch reviews (optionally since a date)
  fetchReviews(since?: Date): Promise<Review[]>;

  // Post a response to a review
  postResponse(reviewId: string, content: string): Promise<PostResponseResult>;

  // Get aggregate rating stats
  getAggregateRating(): Promise<AggregateRating>;
}
