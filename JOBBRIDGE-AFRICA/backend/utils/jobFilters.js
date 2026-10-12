export const buildActiveJobFilter = (now = new Date()) => ({
  $and: [
    {
      $or: [
        { expiryDate: { $gte: now } },
        { expiryDate: null },
      ],
    },
    { isApproved: { $ne: false } },
    { isActive: { $ne: false } },
    { status: { $nin: ['closed', 'expired', 'inactive', 'draft', 'rejected'] } },
  ],
});
