import { supabase } from '@/lib/supabase';

export type StayReview = {
  id: string;
  propertyName: string;
  rating: number;
  note: string;
  createdAt: string;
  ownerReply: string | null;
  repliedAt: string | null;
};

export type ReviewChoice = {
  propertyId: string;
  propertyName: string;
};

export type PublicStayReview = {
  rating: number;
  note: string;
  createdAt: string;
  ownerReply: string | null;
  repliedAt: string | null;
};

export function stayReviewDateLabel(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ratingLabel(rating: number) {
  return `${rating} of 5`;
}

export function reviewSummaryLabel(averageRating: number, reviewCount: number) {
  const reviews = reviewCount === 1 ? '1 review' : `${reviewCount} reviews`;
  return `${averageRating.toFixed(1)} of 5 · ${reviews}`;
}

export type ReviewSummary = {
  propertyId: string;
  reviewCount: number;
  averageRating: number;
};

function ratingValue(value: unknown) {
  const rating = Number(value);
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

function optionalText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function toReview(row: {
  review_id?: unknown;
  property_name?: unknown;
  rating?: unknown;
  note?: unknown;
  created_at?: unknown;
  owner_reply?: unknown;
  replied_at?: unknown;
}): StayReview | null {
  const rating = ratingValue(row.rating);
  if (rating === null || typeof row.property_name !== 'string' || typeof row.note !== 'string' || typeof row.created_at !== 'string') {
    return null;
  }
  return {
    id: typeof row.review_id === 'string' ? row.review_id : '',
    propertyName: row.property_name,
    rating,
    note: row.note,
    createdAt: row.created_at,
    ownerReply: optionalText(row.owner_reply),
    repliedAt: typeof row.replied_at === 'string' ? row.replied_at : null,
  };
}

export async function loadPropertyReviews(propertyId: string): Promise<{ error: string; reviews: PublicStayReview[] }> {
  if (!supabase) {
    return { error: 'Supabase is not connected.', reviews: [] };
  }

  const { data, error } = await supabase.rpc('property_reviews', { target_property: propertyId });
  if (error) {
    return { error: error.message, reviews: [] };
  }

  const reviews = (Array.isArray(data) ? data : []).flatMap((row) => {
    const rating = ratingValue(row.rating);
    if (rating === null || typeof row.note !== 'string' || typeof row.created_at !== 'string') {
      return [];
    }
    return [{
      rating,
      note: row.note,
      createdAt: row.created_at,
      ownerReply: optionalText(row.owner_reply),
      repliedAt: typeof row.replied_at === 'string' ? row.replied_at : null,
    }];
  });
  return { error: '', reviews };
}

export async function loadStayReviewChoices(): Promise<{ error: string; choices: ReviewChoice[] }> {
  if (!supabase) {
    return { error: 'Supabase is not connected.', choices: [] };
  }

  const { data, error } = await supabase.rpc('stay_review_choices');
  if (error) {
    return { error: error.message, choices: [] };
  }

  const choices = (Array.isArray(data) ? data : []).flatMap((row) => {
    if (typeof row.property_id !== 'string' || typeof row.property_name !== 'string') {
      return [];
    }
    return [{ propertyId: row.property_id, propertyName: row.property_name }];
  });
  return { error: '', choices };
}

export async function loadMyStayReviews(): Promise<{ error: string; reviews: StayReview[] }> {
  if (!supabase) {
    return { error: 'Supabase is not connected.', reviews: [] };
  }

  const { data, error } = await supabase.rpc('my_stay_reviews');
  if (error) {
    return { error: error.message, reviews: [] };
  }

  const reviews = (Array.isArray(data) ? data : []).flatMap((row) => {
    const review = toReview(row);
    return review ? [review] : [];
  });
  return { error: '', reviews };
}

export async function loadOwnerStayReviews(): Promise<{ error: string; reviews: StayReview[] }> {
  if (!supabase) {
    return { error: 'Supabase is not connected.', reviews: [] };
  }

  const { data, error } = await supabase.rpc('owner_stay_reviews');
  if (error) {
    return { error: error.message, reviews: [] };
  }

  const reviews = (Array.isArray(data) ? data : []).flatMap((row) => {
    const review = toReview(row);
    return review?.id ? [review] : [];
  });
  return { error: '', reviews };
}

export async function submitStayReview(propertyId: string, rating: number, note: string) {
  if (!supabase) {
    return { error: 'Supabase is not connected.', createdAt: '' };
  }

  const cleaned = note.trim();
  if (rating < 1 || rating > 5) {
    return { error: 'Choose a rating from 1 to 5.', createdAt: '' };
  }
  if (cleaned.length < 10 || cleaned.length > 200) {
    return { error: 'Write 10 to 200 characters.', createdAt: '' };
  }

  const { data, error } = await supabase.rpc('submit_stay_review', {
    target_property: propertyId,
    stay_rating: rating,
    stay_note: cleaned,
  });
  if (error) {
    return { error: error.message, createdAt: '' };
  }
  return { error: '', createdAt: typeof data === 'string' ? data : new Date().toISOString() };
}

export async function replyToStayReview(reviewId: string, note: string) {
  if (!supabase) {
    return { error: 'Supabase is not connected.', repliedAt: '' };
  }

  const cleaned = note.trim();
  if (cleaned.length < 10 || cleaned.length > 200) {
    return { error: 'Write 10 to 200 characters.', repliedAt: '' };
  }

  const { data, error } = await supabase.rpc('reply_to_stay_review', {
    target_review: reviewId,
    reply_note: cleaned,
  });
  if (error) {
    return { error: error.message, repliedAt: '' };
  }
  return { error: '', repliedAt: typeof data === 'string' ? data : new Date().toISOString() };
}

export async function loadReviewSummaries(): Promise<{ error: string; summaries: Record<string, ReviewSummary> }> {
  if (!supabase) {
    return { error: 'Supabase is not connected.', summaries: {} };
  }

  const { data, error } = await supabase.rpc('property_review_summaries');
  if (error) {
    return { error: error.message, summaries: {} };
  }

  const summaries: Record<string, ReviewSummary> = {};
  for (const row of Array.isArray(data) ? data : []) {
    const reviewCount = Number(row.review_count);
    const averageRating = Number(row.average_rating);
    if (
      typeof row.property_id !== 'string' ||
      !Number.isInteger(reviewCount) ||
      reviewCount < 1 ||
      !Number.isFinite(averageRating) ||
      averageRating < 1 ||
      averageRating > 5
    ) {
      continue;
    }
    summaries[row.property_id] = {
      propertyId: row.property_id,
      reviewCount,
      averageRating,
    };
  }
  return { error: '', summaries };
}
