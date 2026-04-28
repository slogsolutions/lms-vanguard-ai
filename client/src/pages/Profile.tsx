import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MdEmail, MdAdminPanelSettings, MdChat, MdMenuBook, MdEvent, MdShield } from 'react-icons/md';
import api from '../api/axios.js';

interface ProfileData {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'soldier';
    createdAt: string;
    stats: {
        chatCount: number;
        contentCount: number;
    }
}

const Profile: React.FC = () => {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/profile');
                if (res.data.success) {
                    setProfile(res.data.data);
                }
            } catch (err) {
                console.error("Failed to fetch profile", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
            </div>
        );
    }

    if (!profile) return null;

    const isAdmin = profile.role === 'admin';

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            {/* Profile Header Card */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-10 relative overflow-hidden border border-white/10"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent-blue/5 rounded-full blur-[100px] -mr-32 -mt-32" />
                
                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center text-5xl font-bold text-white shadow-2xl shadow-accent-blue/20">
                        {profile.name?.[0].toUpperCase()}
                    </div>
                    
                    <div className="text-center md:text-left space-y-2">
                        <div className="flex flex-col md:flex-row items-center gap-3">
                            <h2 className="text-4xl font-bold">{profile.name}</h2>
                            <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${
                                isAdmin ? 'bg-accent-violet/20 text-accent-violet border border-accent-violet/30' : 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                            }`}>
                                {isAdmin ? <MdAdminPanelSettings size={14} /> : <MdShield size={14} />}
                                {profile.role}
                            </span>
                        </div>
                        <p className="text-gray-400 flex items-center justify-center md:justify-start gap-2 text-lg">
                            <MdEmail className="text-gray-500" />
                            {profile.email}
                        </p>
                        <p className="text-gray-500 flex items-center justify-center md:justify-start gap-2 text-sm">
                            <MdEvent />
                            Joined on {new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card p-8 border border-white/10 flex items-center gap-6 group hover:border-accent-blue/30 transition-all"
                >
                    <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 flex items-center justify-center text-accent-blue group-hover:scale-110 transition-transform">
                        <MdChat size={32} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">AI Interactions</p>
                        <h3 className="text-3xl font-bold">{profile.stats.chatCount}</h3>
                        <p className="text-xs text-gray-500 mt-1">Total chat sessions</p>
                    </div>
                </motion.div>

                {isAdmin ? (
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card p-8 border border-white/10 flex items-center gap-6 group hover:border-accent-violet/30 transition-all"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-accent-violet/10 flex items-center justify-center text-accent-violet group-hover:scale-110 transition-transform">
                            <MdMenuBook size={32} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Modules Authored</p>
                            <h3 className="text-3xl font-bold">{profile.stats.contentCount}</h3>
                            <p className="text-xs text-gray-500 mt-1">Courses published</p>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card p-8 border border-white/10 flex items-center gap-6 group hover:border-accent-blue/30 transition-all"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 flex items-center justify-center text-accent-blue group-hover:scale-110 transition-transform">
                            <MdMenuBook size={32} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Learning Progress</p>
                            <h3 className="text-3xl font-bold">Active</h3>
                            <p className="text-xs text-gray-500 mt-1">Involved in training</p>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Account Details Card */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card p-8 border border-white/10"
            >
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <MdShield size={22} className="text-accent-blue" />
                    Account Security
                </h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between py-4 border-b border-white/5">
                        <div>
                            <p className="font-semibold">Password</p>
                            <p className="text-sm text-gray-500">Last changed recently</p>
                        </div>
                        <button className="text-accent-blue text-sm font-bold hover:underline">Change Password</button>
                    </div>
                    <div className="flex items-center justify-between py-4 border-b border-white/5">
                        <div>
                            <p className="font-semibold">Two-Factor Authentication</p>
                            <p className="text-sm text-gray-500">Add an extra layer of security</p>
                        </div>
                        <button className="text-accent-blue text-sm font-bold hover:underline">Enable</button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Profile;
