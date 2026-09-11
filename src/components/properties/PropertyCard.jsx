import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { MapPin, Bed, Bath, Square, TrendingUp, Clock, Gavel } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PropertyCard({ property, index = 0 }) {
    const defaultImage = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80';

    const statusColors = {
        available: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        pending: 'bg-amber-50 text-amber-700 border-amber-200/80',
        rented: 'bg-zinc-100 text-zinc-600 border-zinc-200',
        unlisted: 'bg-rose-50 text-rose-700 border-rose-200/80',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.25 }}
            className="group bg-white rounded-xl overflow-hidden border border-zinc-200/80 hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 transition-[border-color,box-shadow,transform] duration-200 transform-gpu"
        >
            <Link to={createPageUrl(`PropertyDetails?id=${property.id}`)}>
                {/* Image */}
                <div className="relative h-48 sm:h-52 overflow-hidden bg-zinc-100">
                    <img
                        src={property.images?.[0] || defaultImage}
                        alt={property.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                        <Badge className={`${statusColors[property.status]} text-[11px] font-medium px-2 py-0.5 rounded-md`}>
                            {property.status}
                        </Badge>
                        {property.accepts_bidding && (
                            <Badge className="bg-zinc-900 text-white border-zinc-800 text-[11px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Gavel className="w-3 h-3" />
                                Bidding
                            </Badge>
                        )}
                    </div>
                    {property.min_rentscore && (
                        <div className="absolute top-3 right-3 bg-white/95 rounded-md px-2 py-0.5 flex items-center gap-1 border border-zinc-200/60 shadow-xs">
                            <TrendingUp className="w-3 h-3 text-zinc-900" />
                            <span className="text-[11px] font-semibold text-zinc-800">{property.min_rentscore}+</span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-zinc-900 text-base line-clamp-1 group-hover:text-zinc-700 transition-colors">
                            {property.title}
                        </h3>
                        <div className="text-right shrink-0">
                            <p className="text-base font-bold text-zinc-900">R{property.monthly_rent?.toLocaleString()}</p>
                            <p className="text-[11px] text-zinc-400">/month</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 text-zinc-500 text-xs mb-3">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                        <span className="line-clamp-1">{property.address}, {property.city}</span>
                    </div>

                    <div className="flex items-center gap-4 text-zinc-600 text-xs pt-3 border-t border-zinc-100">
                        {property.bedrooms && (
                            <div className="flex items-center gap-1.5">
                                <Bed className="w-3.5 h-3.5 text-zinc-400" />
                                <span>{property.bedrooms} beds</span>
                            </div>
                        )}
                        {property.bathrooms && (
                            <div className="flex items-center gap-1.5">
                                <Bath className="w-3.5 h-3.5 text-zinc-400" />
                                <span>{property.bathrooms} baths</span>
                            </div>
                        )}
                        {property.sqft && (
                            <div className="flex items-center gap-1.5">
                                <Square className="w-3.5 h-3.5 text-zinc-400" />
                                <span>{property.sqft} sqft</span>
                            </div>
                        )}
                    </div>

                    {property.accepts_bidding && property.bidding_ends && (
                        <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 text-zinc-500">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Bidding ends</span>
                            </div>
                            <span className="font-semibold text-zinc-900">
                                {new Date(property.bidding_ends).toLocaleDateString()}
                            </span>
                        </div>
                    )}
                </div>
            </Link>
        </motion.div>
    );
}
