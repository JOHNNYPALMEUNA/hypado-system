
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Client, Project, Installer } from '../types';

interface DataContextType {
    clients: Client[];
    projects: Project[];
    installers: Installer[];
    loading: boolean;
    refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType>({
    clients: [],
    projects: [],
    installers: [],
    loading: true,
    refreshData: async () => { },
});

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [installers, setInstallers] = useState<Installer[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: clientsData, error: clientsError } = await supabase.from('clients').select('*');
            if (clientsError) console.error('Error fetching clients:', clientsError);

            const { data: projectsData, error: projectsError } = await supabase.from('projects').select('*');
            if (projectsError) console.error('Error fetching projects:', projectsError);

            const { data: installersData, error: installersError } = await supabase.from('installers').select('*');
            if (installersError) console.error('Error fetching installers:', installersError);

            if (clientsData) setClients(clientsData as Client[]);
            // Need to cast or map if JSON types mismatch, but for now assuming strict
            if (projectsData) setProjects(projectsData as any[]);
            if (installersData) setInstallers(installersData as Installer[]);
        } catch (error) {
            console.error('Exception fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Subscribe to realtime changes
        const clientSub = supabase.channel('public:clients')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchData())
            .subscribe();

        const projectSub = supabase.channel('public:projects')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(clientSub);
            supabase.removeChannel(projectSub);
        };
    }, []);

    return (
        <DataContext.Provider value={{ clients, projects, installers, loading, refreshData: fetchData }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
