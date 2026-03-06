import React from 'react';
import { Project } from '../types';
import { Building2, Edit3, FolderOpen } from 'lucide-react';
import { formatCurrency, getStatusBadgeClass } from '../utils';
import { useData } from '../contexts/DataContext';

interface ProjectCardProps {
    project: Project;
    viewMode: 'grid' | 'list';
    onEdit: (project: Project) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, viewMode, onEdit }) => {
    const { userRole } = useData();

    if (viewMode === 'list') {
        return (
            <tr className="hover:bg-muted/20 group transition-colors">
                <td className="px-6 py-4 font-medium">{project.workName}</td>
                <td className="px-6 py-4 text-muted-foreground">{project.clientName}</td>
                <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(project.currentStatus)}`}>
                        {project.currentStatus}
                    </span>
                </td>
                <td className="px-6 py-4 text-muted-foreground">{(project.environments || []).length} ambientes</td>
                <td className="px-6 py-4 text-right font-medium">
                    {userRole === 'owner' ? formatCurrency(project.value || 0) : '---'}
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100">
                        <button
                            onClick={() => onEdit(project)}
                            className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Editar Obra"
                        >
                            <Edit3 size={16} />
                        </button>
                        {project.cloudFolderLink && (
                            <a
                                href={project.cloudFolderLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                                title="Abrir Pasta na Nuvem"
                            >
                                <FolderOpen size={16} />
                            </a>
                        )}
                    </div>
                </td>
            </tr>
        );
    }

    return (
        <div className="group bg-card text-card-foreground rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeClass(project.currentStatus)}`}>
                        {project.currentStatus}
                    </span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onEdit(project)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Editar Obra"
                        >
                            <Edit3 size={16} />
                        </button>
                    </div>
                </div>

                <h4 className="text-xl font-bold truncate mb-1">{project.workName}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Building2 size={14} /> {project.clientName}
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                    {(project.environments || []).slice(0, 3).map(env => (
                        <span key={env} className="text-[10px] font-medium bg-muted/50 text-muted-foreground px-2 py-1 rounded-md">{env}</span>
                    ))}
                    {(project.environments || []).length > 3 && (
                        <span className="text-[10px] font-medium bg-muted/50 text-muted-foreground px-2 py-1 rounded-md">
                            +{(project.environments || []).length - 3}
                        </span>
                    )}
                </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-between items-end">
                <div>
                    <span className="text-xs text-muted-foreground block">Valor Total</span>
                    <span className="text-lg font-bold text-emerald-600">
                        {userRole === 'owner' ? formatCurrency(project.value || 0) : 'Restrito'}
                    </span>
                </div>
                <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                        {(project.team || 'NA').slice(0, 2).toUpperCase()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectCard;
