export const MAX_FEED_JOB_AGE_DAYS = 30;

export const buildActiveJobFilter = (now = new Date()) => {
  const freshnessCutoff = new Date(now.getTime() - MAX_FEED_JOB_AGE_DAYS * 24 * 60 * 60 * 1000);
  const feedFreshnessFilter = {
    $or: [
      { source: { $in: ['employer', null] } },
      {
        $and: [
          { source: { $in: ['himalayas', 'remotive', 'aggregated'] } },
          {
            $or: [
              { lastSeenAt: { $gte: freshnessCutoff } },
              {
                $and: [
                  { lastSeenAt: { $exists: false } },
                  {
                    $or: [
                      { pubDate: { $gte: freshnessCutoff } },
                      { createdAt: { $gte: freshnessCutoff } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  return {
    $and: [
      {
        $or: [
          { expiryDate: { $gte: now } },
          { expiryDate: null },
        ],
      },
      { isApproved: { $ne: false } },
      { isActive: { $ne: false } },
      { status: { $nin: ['closed', 'expired', 'inactive', 'draft', 'rejected', 'filled', 'archived', 'paused'] } },
      feedFreshnessFilter,
    ],
  };
};
