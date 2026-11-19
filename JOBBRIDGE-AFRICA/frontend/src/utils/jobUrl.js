export const getJobPath = (job) => {
  const slug = String(job?.title || "job")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const id = job?._id || job?.id;
  return `/jobs/${slug || "job"}-${id}`;
};
