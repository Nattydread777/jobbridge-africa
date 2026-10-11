import { Link } from "react-router-dom";
import PropTypes from "prop-types";

const PageBreadcrumb = ({ to = "/", label = "Back to Home" }) => (
  <nav aria-label="Breadcrumb" className="mx-auto w-full max-w-screen-2xl px-5 pt-6 md:px-10 xl:px-14">
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-sm font-semibold text-charcoal transition hover:border-terracotta hover:text-terracotta"
    >
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  </nav>
);

PageBreadcrumb.propTypes = {
  to: PropTypes.string,
  label: PropTypes.string,
};

export default PageBreadcrumb;
