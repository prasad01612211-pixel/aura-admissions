export const branchRecommendationPriority = [
  { order: 0, key: "geo_distance", label: "Closest mapped branch" },
  { order: 0, key: "pilot_cluster", label: "Same Hyderabad cluster" },
  { order: 0, key: "pilot_pincode", label: "Same pilot pincode" },
  { order: 0, key: "default_order", label: "Pilot fallback order" },
  { order: 1, key: "exact_pincode", label: "Exact pincode match" },
  { order: 2, key: "district", label: "Same district" },
  { order: 3, key: "nearest_city", label: "Nearest city" },
  { order: 4, key: "hostel_required", label: "Hostel availability" },
  { order: 5, key: "course_interest", label: "Course availability" },
  { order: 6, key: "seat_availability", label: "Seat availability" },
  { order: 7, key: "priority_rank", label: "Branch priority rank" },
] as const;
