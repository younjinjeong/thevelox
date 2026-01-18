import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Save, TestTube2, Server, Cloud, Database, HardDrive } from 'lucide-react';
import { clsx } from 'clsx';
import { adminService, StorageSettings } from '@/services/adminService';
import { Button, Input } from '@/components/ui';

type ProviderType = 's3' | 'gcs' | 'minio' | 'openstack';

const providers: { id: ProviderType; name: string; icon: React.ReactNode }[] = [
  { id: 'minio', name: 'MinIO', icon: <Server className="h-4 w-4" /> },
  { id: 's3', name: 'AWS S3', icon: <Cloud className="h-4 w-4" /> },
  { id: 'gcs', name: 'Google Cloud', icon: <Database className="h-4 w-4" /> },
  { id: 'openstack', name: 'OpenStack Swift', icon: <HardDrive className="h-4 w-4" /> },
];

export function AdminStoragePage() {
  const queryClient = useQueryClient();
  const [activeProvider, setActiveProvider] = useState<ProviderType>('minio');
  const [formData, setFormData] = useState<StorageSettings>({
    provider: 'minio',
    minio: {
      endpoint: 'http://minio:9000',
      accessKey: '',
      secretKey: '',
      bucket: 'velox',
      useSSL: false,
    },
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin', 'storage'],
    queryFn: () => adminService.getStorageSettings(),
  });

  useEffect(() => {
    if (settings) {
      setActiveProvider(settings.provider);
      setFormData(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: adminService.updateStorageSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'storage'] });
      toast.success('Storage settings updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    },
  });

  const testMutation = useMutation({
    mutationFn: adminService.testStorageConnection,
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Connection successful!');
      } else {
        toast.error(`Connection failed: ${data.message}`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Connection test failed');
    },
  });

  const handleProviderChange = (provider: ProviderType) => {
    setActiveProvider(provider);
    setFormData((prev) => ({ ...prev, provider }));
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleTest = () => {
    testMutation.mutate(formData);
  };

  const updateMinioField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      minio: { ...prev.minio!, [field]: value },
    }));
  };

  const updateS3Field = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      s3: { ...prev.s3!, [field]: value },
    }));
  };

  const updateGcsField = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      gcs: { ...prev.gcs!, [field]: value },
    }));
  };

  const updateOpenstackField = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      openstack: { ...prev.openstack!, [field]: value },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Storage Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Configure object storage provider for file uploads
        </p>
      </div>

      {/* Provider Tabs */}
      <div className="flex gap-2">
        {providers.map((provider) => (
          <button
            key={provider.id}
            onClick={() => handleProviderChange(provider.id)}
            className={clsx(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeProvider === provider.id
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            )}
          >
            {provider.icon}
            {provider.name}
          </button>
        ))}
      </div>

      {/* Settings Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        {activeProvider === 'minio' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
              MinIO Configuration
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Endpoint"
                placeholder="http://minio:9000"
                value={formData.minio?.endpoint || ''}
                onChange={(e) => updateMinioField('endpoint', e.target.value)}
              />
              <Input
                label="Bucket"
                placeholder="velox"
                value={formData.minio?.bucket || ''}
                onChange={(e) => updateMinioField('bucket', e.target.value)}
              />
              <Input
                label="Access Key"
                placeholder="minioadmin"
                value={formData.minio?.accessKey || ''}
                onChange={(e) => updateMinioField('accessKey', e.target.value)}
              />
              <Input
                label="Secret Key"
                type="password"
                placeholder="********"
                value={formData.minio?.secretKey || ''}
                onChange={(e) => updateMinioField('secretKey', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useSSL"
                checked={formData.minio?.useSSL || false}
                onChange={(e) => updateMinioField('useSSL', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="useSSL" className="text-sm text-slate-700 dark:text-slate-300">
                Use SSL/TLS
              </label>
            </div>
          </div>
        )}

        {activeProvider === 's3' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
              AWS S3 Configuration
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Access Key ID"
                placeholder="AKIAIOSFODNN7EXAMPLE"
                value={formData.s3?.accessKeyId || ''}
                onChange={(e) => updateS3Field('accessKeyId', e.target.value)}
              />
              <Input
                label="Secret Access Key"
                type="password"
                placeholder="********"
                value={formData.s3?.secretAccessKey || ''}
                onChange={(e) => updateS3Field('secretAccessKey', e.target.value)}
              />
              <Input
                label="Region"
                placeholder="us-east-1"
                value={formData.s3?.region || ''}
                onChange={(e) => updateS3Field('region', e.target.value)}
              />
              <Input
                label="Bucket"
                placeholder="my-bucket"
                value={formData.s3?.bucket || ''}
                onChange={(e) => updateS3Field('bucket', e.target.value)}
              />
            </div>
          </div>
        )}

        {activeProvider === 'gcs' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
              Google Cloud Storage Configuration
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Project ID"
                placeholder="my-project-123"
                value={formData.gcs?.projectId || ''}
                onChange={(e) => updateGcsField('projectId', e.target.value)}
              />
              <Input
                label="Bucket"
                placeholder="my-bucket"
                value={formData.gcs?.bucket || ''}
                onChange={(e) => updateGcsField('bucket', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Service Account Key (JSON)
              </label>
              <textarea
                className="w-full rounded-lg border border-slate-300 p-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                rows={6}
                placeholder='{"type": "service_account", ...}'
                value={formData.gcs?.credentials || ''}
                onChange={(e) => updateGcsField('credentials', e.target.value)}
              />
            </div>
          </div>
        )}

        {activeProvider === 'openstack' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">
              OpenStack Swift Configuration
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Keystone Auth URL"
                placeholder="http://keystone:5000/v2.0"
                value={formData.openstack?.authUrl || ''}
                onChange={(e) => updateOpenstackField('authUrl', e.target.value)}
              />
              <Input
                label="Tenant ID"
                placeholder="your-tenant-id"
                value={formData.openstack?.tenantId || ''}
                onChange={(e) => updateOpenstackField('tenantId', e.target.value)}
              />
              <Input
                label="Username"
                placeholder="swift-username"
                value={formData.openstack?.username || ''}
                onChange={(e) => updateOpenstackField('username', e.target.value)}
              />
              <Input
                label="Password"
                type="password"
                placeholder="********"
                value={formData.openstack?.password || ''}
                onChange={(e) => updateOpenstackField('password', e.target.value)}
              />
              <Input
                label="Container Name"
                placeholder="velox"
                value={formData.openstack?.container || ''}
                onChange={(e) => updateOpenstackField('container', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            leftIcon={<TestTube2 className="h-4 w-4" />}
            onClick={handleTest}
            isLoading={testMutation.isPending}
          >
            Test Connection
          </Button>
          <Button
            leftIcon={<Save className="h-4 w-4" />}
            onClick={handleSave}
            isLoading={updateMutation.isPending}
          >
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
