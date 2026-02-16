import React, { useEffect } from 'react';

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: 'website' | 'article';
    keywords?: string[];
}

/**
 * SEO component for dynamic meta tags
 * Updates document head with Open Graph, Twitter Card, and other SEO tags
 */
export const SEO: React.FC<SEOProps> = ({
    title = 'GeoNotes AI - Location-Aware Note-Taking with AI',
    description = 'Smart note-taking app that remembers where you created your notes. Powered by AI for intelligent search and organization. Works offline, syncs everywhere.',
    image = '/og-image.png',
    url,
    type = 'website',
    keywords = ['notes', 'location', 'AI', 'productivity', 'geolocation', 'note-taking'],
}) => {
    useEffect(() => {
        // Update title
        document.title = title;

        // Update or create meta tags
        const updateMetaTag = (property: string, content: string, isProperty = true) => {
            const attribute = isProperty ? 'property' : 'name';
            let element = document.querySelector(`meta[${attribute}="${property}"]`);

            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attribute, property);
                document.head.appendChild(element);
            }

            element.setAttribute('content', content);
        };

        // Standard meta tags
        updateMetaTag('description', description, false);
        updateMetaTag('keywords', keywords.join(', '), false);

        // Open Graph tags
        updateMetaTag('og:title', title);
        updateMetaTag('og:description', description);
        updateMetaTag('og:image', image);
        updateMetaTag('og:type', type);
        if (url) updateMetaTag('og:url', url);

        // Twitter Card tags
        updateMetaTag('twitter:card', 'summary_large_image', false);
        updateMetaTag('twitter:title', title, false);
        updateMetaTag('twitter:description', description, false);
        updateMetaTag('twitter:image', image, false);

        // Additional SEO tags
        updateMetaTag('application-name', 'GeoNotes AI', false);
        updateMetaTag('apple-mobile-web-app-title', 'GeoNotes', false);
    }, [title, description, image, url, type, keywords]);

    return null; // This component doesn't render anything
};
