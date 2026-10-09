import React from "react";
import { X } from "lucide-react";

export default function TrailerModal({ movie, onClose }) {
  if (!movie) return null;

  // Extract YouTube ID if it is a YouTube URL
  const getEmbedUrl = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : null;
  };

  const embedUrl = getEmbedUrl(movie.trailer_url);

  return (
    <div className="trailer-modal-backdrop" onClick={onClose}>
      <div className="trailer-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="trailer-modal-header">
          <h3>{movie.title} — Official Trailer</h3>
          <button className="btn-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="trailer-video-wrapper">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={`${movie.title} Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="no-trailer-fallback">
              <p>Trailer stream is currently unavailable for this title.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
