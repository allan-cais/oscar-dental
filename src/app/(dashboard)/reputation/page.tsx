"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Star,
  TrendingUp,
  MessageSquare,
  Clock,
  ThumbsUp,
  AlertTriangle,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  Pencil,
  Eye,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Sentiment = "Positive" | "Neutral" | "Negative"
type ResponseStatus = "Draft" | "Approved" | "Posted" | "None"

interface Review {
  id: string
  reviewerName: string
  reviewerInitial: string
  avatarColor: string
  date: string
  rating: number
  text: string
  sentiment: Sentiment
  keywords: string[]
  responseStatus: ResponseStatus
  aiDraft?: string
  postedResponse?: string
}

interface MonthTrend {
  month: string
  count: number
  avgSentiment: number // 0-100
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const MOCK_REVIEWS: Review[] = [
  {
    id: "r1",
    reviewerName: "Jennifer Martinez",
    reviewerInitial: "J",
    avatarColor: "bg-blue-500",
    date: "2026-02-04",
    rating: 1,
    text: "Terrible experience. Waited over an hour past my appointment time. The front desk staff was dismissive when I asked about the delay. I won't be coming back here again. Very unprofessional.",
    sentiment: "Negative",
    keywords: ["wait time", "front desk", "unprofessional"],
    responseStatus: "None",
  },
  {
    id: "r2",
    reviewerName: "Robert Kim",
    reviewerInitial: "R",
    avatarColor: "bg-red-500",
    date: "2026-02-04",
    rating: 2,
    text: "Had a filling done and the billing was way more than quoted. Called three times to get an explanation and still haven't heard back. Very frustrating experience with the billing department.",
    sentiment: "Negative",
    keywords: ["billing", "overcharged", "no callback"],
    responseStatus: "None",
  },
  {
    id: "r3",
    reviewerName: "Sarah Thompson",
    reviewerInitial: "S",
    avatarColor: "bg-emerald-500",
    date: "2026-02-03",
    rating: 5,
    text: "Dr. Park is absolutely wonderful! She explained every step of my root canal and made sure I was comfortable throughout. The entire team is so welcoming. Best dental experience I've ever had!",
    sentiment: "Positive",
    keywords: ["Dr. Park", "root canal", "comfortable", "welcoming"],
    responseStatus: "Draft",
    aiDraft:
      "Thank you so much for your kind words, Sarah! Dr. Park truly cares about making every patient feel comfortable, and we're thrilled to hear your root canal experience was positive. We look forward to seeing you at your next visit!",
  },
  {
    id: "r4",
    reviewerName: "Michael Chen",
    reviewerInitial: "M",
    avatarColor: "bg-purple-500",
    date: "2026-02-02",
    rating: 5,
    text: "Quick and efficient cleaning. The hygienist was thorough and gentle. Love the new text-to-pay feature - made checkout a breeze. Highly recommend Canopy Dental!",
    sentiment: "Positive",
    keywords: ["cleaning", "efficient", "text-to-pay", "recommend"],
    responseStatus: "Posted",
    postedResponse:
      "Thank you, Michael! We're glad you enjoyed the convenience of our text-to-pay feature. See you at your next cleaning!",
  },
  {
    id: "r5",
    reviewerName: "Amanda Lewis",
    reviewerInitial: "A",
    avatarColor: "bg-amber-500",
    date: "2026-02-01",
    rating: 4,
    text: "Good experience overall. The office is clean and modern. Only minor issue was a short wait, but the staff kept me informed. Dr. Salter was great with my kids.",
    sentiment: "Positive",
    keywords: ["clean office", "kids", "Dr. Salter", "minor wait"],
    responseStatus: "Draft",
    aiDraft:
      "Thank you for your review, Amanda! We're happy Dr. Salter made your kids feel at ease. We apologize for the brief wait and appreciate your patience. We strive to keep everyone informed when delays occur.",
  },
  {
    id: "r6",
    reviewerName: "David Park",
    reviewerInitial: "D",
    avatarColor: "bg-cyan-500",
    date: "2026-01-30",
    rating: 3,
    text: "Decent dental work but the scheduling system is confusing. I had trouble booking online and had to call in. The receptionist was helpful once I got through though.",
    sentiment: "Neutral",
    keywords: ["scheduling", "online booking", "receptionist"],
    responseStatus: "None",
  },
  {
    id: "r7",
    reviewerName: "Lisa Rodriguez",
    reviewerInitial: "L",
    avatarColor: "bg-pink-500",
    date: "2026-01-28",
    rating: 5,
    text: "Best dental office in town! The team remembered my name and my preferences. Felt like visiting family. The whitening results are amazing too!",
    sentiment: "Positive",
    keywords: ["personalized", "whitening", "friendly"],
    responseStatus: "Posted",
    postedResponse:
      "We love hearing this, Lisa! Our team takes pride in building personal relationships with every patient. Enjoy your bright new smile!",
  },
  {
    id: "r8",
    reviewerName: "James Wilson",
    reviewerInitial: "J",
    avatarColor: "bg-indigo-500",
    date: "2026-01-25",
    rating: 4,
    text: "Professional service from start to finish. The digital X-rays were quick and the dentist took time to explain the results. Pricing is fair for the area.",
    sentiment: "Positive",
    keywords: ["professional", "digital X-rays", "fair pricing"],
    responseStatus: "Draft",
    aiDraft:
      "Thank you, James! We invest in the latest digital technology to make your visits more efficient. We appreciate you choosing Canopy Dental and look forward to your next appointment!",
  },
  {
    id: "r9",
    reviewerName: "Karen White",
    reviewerInitial: "K",
    avatarColor: "bg-teal-500",
    date: "2026-01-22",
    rating: 3,
    text: "The dental work itself was fine but the office was running behind schedule. I appreciate that they apologized but it would be nice if they could manage the calendar better.",
    sentiment: "Neutral",
    keywords: ["behind schedule", "calendar management"],
    responseStatus: "None",
  },
  {
    id: "r10",
    reviewerName: "Tom Bradley",
    reviewerInitial: "T",
    avatarColor: "bg-orange-500",
    date: "2026-01-18",
    rating: 5,
    text: "Emergency appointment handled perfectly. Had a cracked tooth on a Saturday and they got me in within 2 hours. The pain management was excellent. Can't thank them enough!",
    sentiment: "Positive",
    keywords: ["emergency", "cracked tooth", "fast response", "pain management"],
    responseStatus: "None",
  },
  {
    id: "r11",
    reviewerName: "Emily Nguyen",
    reviewerInitial: "E",
    avatarColor: "bg-rose-500",
    date: "2026-01-15",
    rating: 2,
    text: "Insurance processing was a nightmare. Took 3 weeks to get a straight answer on what was covered. The dental work was okay but the admin side needs serious improvement.",
    sentiment: "Negative",
    keywords: ["insurance", "slow processing", "admin issues"],
    responseStatus: "None",
  },
  {
    id: "r12",
    reviewerName: "Chris Anderson",
    reviewerInitial: "C",
    avatarColor: "bg-lime-500",
    date: "2026-01-10",
    rating: 4,
    text: "Solid dental practice. My family has been coming here for years. They're always friendly and professional. The kids' area is a nice touch.",
    sentiment: "Positive",
    keywords: ["family practice", "kids area", "loyal patient"],
    responseStatus: "None",
  },
]

const MOCK_MONTH_TRENDS: MonthTrend[] = [
  { month: "Sep", count: 14, avgSentiment: 68 },
  { month: "Oct", count: 22, avgSentiment: 75 },
  { month: "Nov", count: 19, avgSentiment: 71 },
  { month: "Dec", count: 16, avgSentiment: 80 },
  { month: "Jan", count: 21, avgSentiment: 78 },
  { month: "Feb", count: 18, avgSentiment: 82 },
]

const STAR_DISTRIBUTION = [
  { stars: 5, count: 156, pct: 63 },
  { stars: 4, count: 52, pct: 21 },
  { stars: 3, count: 19, pct: 8 },
  { stars: 2, count: 12, pct: 5 },
  { stars: 1, count: 8, pct: 3 },
]

const STAR_BAR_COLORS: Record<number, string> = {
  5: "bg-emerald-500",
  4: "bg-lime-500",
  3: "bg-yellow-500",
  2: "bg-orange-500",
  1: "bg-red-500",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={
            i <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted"
          }
        />
      ))}
    </span>
  )
}

function sentimentColor(s: Sentiment) {
  switch (s) {
    case "Positive":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
    case "Neutral":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    case "Negative":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  }
}

function responseStatusBadge(s: ResponseStatus) {
  switch (s) {
    case "Draft":
      return { label: "Draft", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" }
    case "Approved":
      return { label: "Approved", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" }
    case "Posted":
      return { label: "Posted", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" }
    case "None":
      return { label: "No Response", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" }
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return "just now"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "1 day ago"
  return `${days} days ago`
}

function trendBarColor(sentiment: number) {
  if (sentiment >= 75) return "bg-emerald-500"
  if (sentiment >= 60) return "bg-yellow-500"
  return "bg-red-500"
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReputationPage() {
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())
  const [editingDraft, setEditingDraft] = useState<string | null>(null)
  const [draftText, setDraftText] = useState("")
  const [generateDialogReview, setGenerateDialogReview] = useState<Review | null>(null)
  const [filterRating, setFilterRating] = useState<string>("all")
  const [filterSentiment, setFilterSentiment] = useState<string>("all")

  // Try Convex, fall back to mock
  let convexError = false
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery(api.reputation?.queries?.getDashboard as any)
  } catch {
    convexError = true
  }

  const reviews = MOCK_REVIEWS
  const trends = MOCK_MONTH_TRENDS
  const starDist = STAR_DISTRIBUTION

  // Priority alerts: 1-2 star reviews without a response
  const priorityAlerts = reviews.filter(
    (r) => r.rating <= 2 && r.responseStatus === "None"
  )

  // Filtered reviews
  const filteredReviews = reviews.filter((r) => {
    if (filterRating !== "all" && r.rating !== Number(filterRating)) return false
    if (filterSentiment !== "all" && r.sentiment !== filterSentiment) return false
    return true
  })

  function toggleExpand(id: string) {
    setExpandedReviews((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleEditDraft(review: Review) {
    setEditingDraft(review.id)
    setDraftText(review.aiDraft ?? "")
  }

  function handleGenerateResponse(review: Review) {
    setGenerateDialogReview(review)
    setDraftText(
      `Thank you for sharing your feedback, ${review.reviewerName.split(" ")[0]}. We take your concerns seriously and would love the opportunity to make things right. Please reach out to our office directly so we can address this promptly.`
    )
  }

  const maxTrendCount = Math.max(...trends.map((t) => t.count))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reputation Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor reviews, track sentiment, and manage responses across all
          locations.
        </p>
      </div>

      {convexError && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Convex backend is not connected. Displaying mock data for preview.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Key Metrics Cards                                                 */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Google Rating */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-medium">Google Rating</CardDescription>
            <Star className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">4.7</span>
              <StarRating rating={5} size={14} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="text-emerald-600">+0.2</span> from last quarter
            </p>
          </CardContent>
        </Card>

        {/* Total Reviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-medium">Total Reviews</CardDescription>
            <MessageSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">247</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Across all platforms
            </p>
          </CardContent>
        </Card>

        {/* This Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-medium">This Month</CardDescription>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="text-emerald-600">+3</span> vs last month
            </p>
          </CardContent>
        </Card>

        {/* Response Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-medium">Response Rate</CardDescription>
            <Send className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Target: 100% within 24h
            </p>
          </CardContent>
        </Card>

        {/* Avg Response Time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-medium">Avg Response Time</CardDescription>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2 hrs</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Target: &lt;24 hours
            </p>
          </CardContent>
        </Card>

        {/* Sentiment Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-xs font-medium">Sentiment Score</CardDescription>
            <ThumbsUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">82<span className="text-base font-normal text-muted-foreground">/100</span></div>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="text-emerald-600">+4</span> from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Star Distribution + Monthly Trend (side by side on lg+)           */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Star Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Star Distribution</CardTitle>
            <CardDescription>Breakdown of 247 total reviews</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {starDist.map((row) => (
              <div key={row.stars} className="flex items-center gap-3">
                <span className="w-12 text-sm font-medium text-right">
                  {row.stars} star{row.stars !== 1 ? "s" : ""}
                </span>
                <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${STAR_BAR_COLORS[row.stars]}`}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
                <span className="w-20 text-sm text-muted-foreground text-right">
                  {row.count} ({row.pct}%)
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Trend</CardTitle>
            <CardDescription>Reviews per month, colored by avg sentiment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-40">
              {trends.map((t) => (
                <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t.count}
                  </span>
                  <div
                    className={`w-full rounded-t ${trendBarColor(t.avgSentiment)}`}
                    style={{
                      height: `${(t.count / maxTrendCount) * 100}%`,
                      minHeight: "8px",
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{t.month}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block size-2.5 rounded-full bg-emerald-500" />
                Sentiment 75+
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-2.5 rounded-full bg-yellow-500" />
                Sentiment 60-74
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block size-2.5 rounded-full bg-red-500" />
                Sentiment &lt;60
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Priority Alerts                                                    */}
      {/* ----------------------------------------------------------------- */}
      {priorityAlerts.length > 0 && (
        <Card className="border-red-300 dark:border-red-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              <CardTitle className="text-base text-red-700 dark:text-red-400">
                Priority Alerts
              </CardTitle>
              <Badge variant="destructive" className="ml-auto">
                {priorityAlerts.length} need response
              </Badge>
            </div>
            <CardDescription>
              Low-rating reviews requiring immediate attention (SLA: respond
              within 2 hours)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {priorityAlerts.map((review) => (
              <div
                key={review.id}
                className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex gap-3">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${review.avatarColor}`}
                  >
                    {review.reviewerInitial}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{review.reviewerName}</span>
                      <StarRating rating={review.rating} size={14} />
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(review.date)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {review.text}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="shrink-0"
                  onClick={() => handleGenerateResponse(review)}
                >
                  Respond Now
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Recent Reviews                                                     */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Recent Reviews</CardTitle>
              <CardDescription>
                {filteredReviews.length} review{filteredReviews.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterRating} onValueChange={setFilterRating}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSentiment} onValueChange={setFilterSentiment}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sentiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sentiment</SelectItem>
                  <SelectItem value="Positive">Positive</SelectItem>
                  <SelectItem value="Neutral">Neutral</SelectItem>
                  <SelectItem value="Negative">Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredReviews.map((review) => {
            const isExpanded = expandedReviews.has(review.id)
            const statusBadge = responseStatusBadge(review.responseStatus)
            const isEditing = editingDraft === review.id

            return (
              <div
                key={review.id}
                className="rounded-lg border p-4"
              >
                {/* Review header */}
                <div className="flex items-start gap-3">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${review.avatarColor}`}
                  >
                    {review.reviewerInitial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{review.reviewerName}</span>
                      <StarRating rating={review.rating} size={14} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Review text */}
                    <p
                      className={`mt-2 text-sm ${
                        !isExpanded && review.text.length > 150
                          ? "line-clamp-2"
                          : ""
                      }`}
                    >
                      {review.text}
                    </p>
                    {review.text.length > 150 && (
                      <button
                        onClick={() => toggleExpand(review.id)}
                        className="mt-1 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        {isExpanded ? (
                          <>
                            Show less <ChevronUp className="size-3" />
                          </>
                        ) : (
                          <>
                            Read more <ChevronDown className="size-3" />
                          </>
                        )}
                      </button>
                    )}

                    {/* Badges row */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge className={sentimentColor(review.sentiment)}>
                        {review.sentiment}
                      </Badge>
                      <Badge className={statusBadge.className}>
                        {statusBadge.label}
                      </Badge>
                      {review.keywords.map((kw) => (
                        <Badge key={kw} variant="outline" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>

                    {/* AI Response section */}
                    {review.responseStatus === "Posted" && review.postedResponse && (
                      <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
                        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          <Check className="size-3" />
                          Posted Response
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {review.postedResponse}
                        </p>
                      </div>
                    )}

                    {review.responseStatus === "Draft" && review.aiDraft && !isEditing && (
                      <div className="mt-3 rounded-md border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
                        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                          <Sparkles className="size-3" />
                          AI Response Draft
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {review.aiDraft}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" variant="default" className="h-7 text-xs">
                            <Check className="mr-1 size-3" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleEditDraft(review)}
                          >
                            <Pencil className="mr-1 size-3" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            <Send className="mr-1 size-3" />
                            Post
                          </Button>
                        </div>
                      </div>
                    )}

                    {isEditing && (
                      <div className="mt-3 rounded-md border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
                        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                          <Pencil className="size-3" />
                          Editing Response
                        </div>
                        <Textarea
                          value={draftText}
                          onChange={(e) => setDraftText(e.target.value)}
                          rows={3}
                          className="mb-2"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs">
                            <Check className="mr-1 size-3" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setEditingDraft(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {review.responseStatus === "None" && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleGenerateResponse(review)}
                        >
                          <Sparkles className="mr-1 size-3" />
                          Generate AI Response
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {filteredReviews.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No reviews match the current filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Generate Response Dialog                                           */}
      {/* ----------------------------------------------------------------- */}
      <Dialog
        open={generateDialogReview !== null}
        onOpenChange={(open) => {
          if (!open) setGenerateDialogReview(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate AI Response</DialogTitle>
            <DialogDescription>
              Review and edit the AI-generated response before posting.
            </DialogDescription>
          </DialogHeader>
          {generateDialogReview && (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {generateDialogReview.reviewerName}
                  </span>
                  <StarRating rating={generateDialogReview.rating} size={12} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {generateDialogReview.text}
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Your Response
                </label>
                <Textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGenerateDialogReview(null)}
            >
              Cancel
            </Button>
            <Button onClick={() => setGenerateDialogReview(null)}>
              <Eye className="mr-1.5 size-4" />
              Save as Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
