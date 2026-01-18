{{/*
Expand the name of the chart.
*/}}
{{- define "velox.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "velox.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "velox.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "velox.labels" -}}
helm.sh/chart: {{ include "velox.chart" . }}
{{ include "velox.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "velox.selectorLabels" -}}
app.kubernetes.io/name: {{ include "velox.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "velox.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "velox.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
MongoDB connection string
*/}}
{{- define "velox.mongodbUri" -}}
{{- if .Values.secrets.mongodbUri }}
{{- .Values.secrets.mongodbUri }}
{{- else if .Values.mongodb.enabled }}
{{- printf "mongodb://%s:%s@%s-mongodb:27017/%s?authSource=%s" .Values.mongodb.auth.username .Values.mongodb.auth.password .Release.Name .Values.mongodb.auth.database .Values.mongodb.auth.database }}
{{- else }}
{{- required "MongoDB URI is required when mongodb.enabled is false" .Values.secrets.mongodbUri }}
{{- end }}
{{- end }}

{{/*
Redis host
*/}}
{{- define "velox.redisHost" -}}
{{- if .Values.secrets.redisHost }}
{{- .Values.secrets.redisHost }}
{{- else if .Values.redis.enabled }}
{{- printf "%s-redis-master" .Release.Name }}
{{- else }}
{{- required "Redis host is required when redis.enabled is false" .Values.secrets.redisHost }}
{{- end }}
{{- end }}

{{/*
Redis port
*/}}
{{- define "velox.redisPort" -}}
{{- if .Values.secrets.redisPort }}
{{- .Values.secrets.redisPort }}
{{- else }}
{{- "6379" }}
{{- end }}
{{- end }}

{{/*
Redis password
*/}}
{{- define "velox.redisPassword" -}}
{{- if .Values.secrets.redisPassword }}
{{- .Values.secrets.redisPassword }}
{{- else if .Values.redis.enabled }}
{{- .Values.redis.auth.password }}
{{- else }}
{{- "" }}
{{- end }}
{{- end }}
