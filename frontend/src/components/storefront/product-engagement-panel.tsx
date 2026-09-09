'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api-client';
import {
  addToWishlist,
  fetchProductReviews,
  listWishlist,
  removeFromWishlist,
  submitProductReview,
  type ProductReview,
  type ProductReviewSummary,
} from '@/lib/engagement-api';

export function ProductEngagementPanel({ productId }: { readonly productId: string }) {
  const [summary, setSummary] = useState<ProductReviewSummary | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [wishlisted, setWishlisted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const reload = useCallback(async () => {
    try {
      const data = await fetchProductReviews(productId);
      setSummary(data.summary);
      setReviews(data.reviews);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not load reviews.');
    }
    try {
      const wishlist = await listWishlist();
      setWishlisted(wishlist.some((item) => item.productId === productId));
    } catch {
      setWishlisted(false);
    }
  }, [productId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function toggleWishlist() {
    setPending(true);
    setMessage(null);
    try {
      if (wishlisted) {
        await removeFromWishlist(productId);
        setWishlisted(false);
        setMessage('Removed from wishlist.');
      } else {
        await addToWishlist({ productId });
        setWishlisted(true);
        setMessage('Saved to wishlist.');
      }
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Sign in to manage your wishlist.',
      );
    } finally {
      setPending(false);
    }
  }

  async function onSubmitReview(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      await submitProductReview({ productId, rating, title, body });
      setTitle('');
      setBody('');
      setMessage('Review published.');
      await reload();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Sign in to leave a review.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-6 border-t border-border pt-8" aria-labelledby="engagement-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="engagement-heading" className="text-lg font-semibold">
            Reviews & wishlist
          </h2>
          <p className="text-sm text-muted-foreground">
            {summary && summary.reviewCount > 0
              ? `${summary.averageRating.toFixed(1)} / 5 · ${summary.reviewCount} review(s)`
              : 'No reviews yet — be the first.'}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => void toggleWishlist()}>
          {wishlisted ? '♥ Saved' : '♡ Save to wishlist'}
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
          {message}
        </p>
      ) : null}

      <ul className="space-y-3">
        {reviews.map((review) => (
          <li key={review.id} className="rounded-md border border-border p-3 text-sm">
            <p className="font-medium">
              {'★'.repeat(review.rating)}
              {'☆'.repeat(5 - review.rating)} · {review.title}
            </p>
            <p className="mt-1 text-muted-foreground">{review.body}</p>
          </li>
        ))}
      </ul>

      <form onSubmit={(e) => void onSubmitReview(e)} className="space-y-3 rounded-md border border-border p-4">
        <h3 className="text-sm font-semibold">Write a review</h3>
        <label className="block text-xs">
          Rating
          <select
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} star{n === 1 ? '' : 's'}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs">
          Title
          <input
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            minLength={3}
            required
          />
        </label>
        <label className="block text-xs">
          Review
          <textarea
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            minLength={10}
            required
          />
        </label>
        <Button type="submit" size="sm" disabled={pending}>
          Publish review
        </Button>
      </form>
    </section>
  );
}
