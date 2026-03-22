import { useState, useEffect } from 'react'
import axios from 'axios'
import { Images, Calendar, MapPin, User, ChevronLeft, ChevronRight, X } from 'lucide-react'

const EventGallery = () => {
  const [gallery, setGallery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  useEffect(() => {
    fetchGallery()
  }, [])

  const fetchGallery = async () => {
    try {
      const { data } = await axios.get('/api/feedback/gallery/latest')
      setGallery(data.event ? data : null)
    } catch {
      setGallery(null)
    } finally {
      setLoading(false)
    }
  }

  const openLightbox = (index) => setLightboxIndex(index)
  const closeLightbox = () => setLightboxIndex(null)
  const prevImage = () => setLightboxIndex(i => (i - 1 + gallery.images.length) % gallery.images.length)
  const nextImage = () => setLightboxIndex(i => (i + 1) % gallery.images.length)

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!gallery || !gallery.event) {
    return (
      <div className="text-center py-16 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
        <div className="inline-block p-6 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-full mb-4">
          <Images className="w-12 h-12 text-gray-400" />
        </div>
        <p className="text-gray-400 text-lg font-semibold">No recent event gallery</p>
        <p className="text-gray-500 text-sm mt-1">Photos from completed events will appear here</p>
      </div>
    )
  }

  const { event, images } = gallery

  return (
    <div className="space-y-6">
      {/* Event info */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
        <div className="flex flex-wrap gap-4 text-sm text-gray-300">
          <span className="flex items-center gap-2"><User className="w-4 h-4 text-purple-400" />{event.faculty}</span>
          <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-400" />{event.venue}</span>
          <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-green-400" />{new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <h3 className="text-xl font-bold text-white mt-3">{event.reason}</h3>
      </div>

      {/* Image grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((src, i) => (
          <div key={i} onClick={() => openLightbox(i)}
            className="relative group cursor-pointer overflow-hidden rounded-xl aspect-square bg-white/5">
            <img src={src} alt={`Event photo ${i + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
              <Images className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={closeLightbox}>
          <button onClick={closeLightbox} className="absolute top-4 right-4 text-white bg-white/10 rounded-full p-2 hover:bg-white/20 transition-all">
            <X className="w-6 h-6" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); prevImage() }} className="absolute left-4 text-white bg-white/10 rounded-full p-3 hover:bg-white/20 transition-all">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <img src={images[lightboxIndex]} alt="" className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
          <button onClick={(e) => { e.stopPropagation(); nextImage() }} className="absolute right-4 text-white bg-white/10 rounded-full p-3 hover:bg-white/20 transition-all">
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 text-gray-400 text-sm">{lightboxIndex + 1} / {images.length}</div>
        </div>
      )}
    </div>
  )
}

export default EventGallery
