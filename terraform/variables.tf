variable "project_id" {
  description = "The Google Cloud Project ID"
  type        = string
}

variable "region" {
  description = "The Google Cloud region to deploy resources"
  type        = string
  default     = "northamerica-northeast1"
}

variable "container_image" {
  description = "The URL of the Docker image to deploy"
  type        = string
}

variable "connection_string" {
  description = "MongoDB Connection String (Sensitive)"
  type        = string
  sensitive   = true
}

variable "firebase_private_key" {
  description = "Firebase Private Key (Sensitive)"
  type        = string
  sensitive   = true
}

variable "firebase_client_email" {
  description = "Firebase Client Email"
  type        = string
  sensitive   = true
}

variable "stripe_secret_key" {
  description = "Stripe Secret Key (Sensitive)"
  type        = string
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe Webhook Secret (Sensitive)"
  type        = string
  sensitive   = true
}

variable "stripe_publishable_key" {
  description = "Stripe Publishable Key"
  type        = string
}
