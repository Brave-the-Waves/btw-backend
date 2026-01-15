#step #1: defining the provider
provider "google" {
  project = var.project_id
  region  = var.region
}