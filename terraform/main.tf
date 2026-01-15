# Step 2: Enable APIs

# google_project_service: Allows management of a single API service for a Google Cloud project
# Used to manage and deploy Cloud Run resources, such as containerized applications and services.
resource "google_project_service" "run_api" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

# Used to manage and deploy Secret Manager resources, such as storing sensitive configuration data.
resource "google_project_service" "secretmanager_api" {
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

# Used to manage IAM resources, such as roles and permissions for accessing Google Cloud services.
resource "google_project_service" "iam_api" {
  service            = "iam.googleapis.com"
  disable_on_destroy = false
}

# Used to manage Artifact Registry resources, such as container image repositories.
resource "google_project_service" "artifactregistry_api" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

# Step 5: Storage (Artifact Registry) - Defined early to ensure availability
# Create an Artifact Registry repository for Artifacts like Docker images
resource "google_artifact_registry_repository" "repo" {
  location      = var.region
  repository_id = "btw-backend-repo"
  description   = "Docker repository for Brave The Waves Backend"
  format        = "DOCKER"

  depends_on = [google_project_service.artifactregistry_api]
}

# --- SECRET MANAGER RESOURCES ---
# Create secrets in Google Secret Manager

#Note: Replication controls where Secret Manager stores your secret data.
#Auto replication stores data in multiple locations.
resource "google_secret_manager_secret" "connection_string" {
  secret_id = "connection-string"
  replication {
    auto {}
  }
  depends_on = [google_project_service.secretmanager_api]
}

resource "google_secret_manager_secret_version" "connection_string_version" {
  secret      = google_secret_manager_secret.connection_string.id
  secret_data = var.connection_string
}

resource "google_secret_manager_secret" "firebase_private_key" {
  secret_id = "firebase-private-key"
  replication {
    auto {}
  }
  depends_on = [google_project_service.secretmanager_api]
}

resource "google_secret_manager_secret_version" "firebase_private_key_version" {
  secret      = google_secret_manager_secret.firebase_private_key.id
  secret_data = var.firebase_private_key
}

resource "google_secret_manager_secret" "firebase_client_email" {
  secret_id = "firebase-client-email"
  replication {
    auto {}
  }
  depends_on = [google_project_service.secretmanager_api]
}

resource "google_secret_manager_secret_version" "firebase_client_email_version" {
  secret      = google_secret_manager_secret.firebase_client_email.id
  secret_data = var.firebase_client_email
}

resource "google_secret_manager_secret" "stripe_secret_key" {
  secret_id = "stripe-secret-key"
  replication {
    auto {}
  }
  depends_on = [google_project_service.secretmanager_api]
}

resource "google_secret_manager_secret_version" "stripe_secret_key_version" {
  secret      = google_secret_manager_secret.stripe_secret_key.id
  secret_data = var.stripe_secret_key
}

resource "google_secret_manager_secret" "stripe_webhook_secret" {
  secret_id = "stripe-webhook-secret"
  replication {
    auto {}
  }
  depends_on = [google_project_service.secretmanager_api]
}

resource "google_secret_manager_secret_version" "stripe_webhook_secret_version" {
  secret      = google_secret_manager_secret.stripe_webhook_secret.id
  secret_data = var.stripe_webhook_secret
}

# Grant Cloud Run access to secrets
# Google Cloud sets project = var.project_id by default so no need to specify it here
data "google_project" "project" {}

resource "google_secret_manager_secret_iam_member" "secret_access" {
  # Create an IAM member for each secret
  for_each = toset([
    google_secret_manager_secret.connection_string.id,
    google_secret_manager_secret.firebase_private_key.id,
    google_secret_manager_secret.firebase_client_email.id,
    google_secret_manager_secret.stripe_secret_key.id,
    google_secret_manager_secret.stripe_webhook_secret.id
  ])

  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
  
  # Ensure API is enabled first
  depends_on = [google_project_service.secretmanager_api]
}


# Step 3: Mix the Application (Cloud Run Service)
resource "google_cloud_run_service" "backend" {
  name     = "btw-backend"
  location = var.region

  template {
    spec {
      containers {
        image = var.container_image
        
        ports {
          container_port = 8080 
        }

        # Environment Variables (Non-Sensitive)
        env {
          name  = "NODE_ENV"
          value = "production"
        }
        env {
          name  = "FIREBASE_AUTH_MODE"
          value = "production"
        }
        env {
          name  = "FIREBASE_PROJECT_ID"
          value = var.project_id
        }
        # Add Stripe Publishable Key here as it's not a secret
        env {
            name  = "STRIPE_PUBLISHABLE_KEY"
            value = var.stripe_publishable_key
        }

        # Secret Injection
        env {
          name = "CONNECTION_STRING"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.connection_string.secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "FIREBASE_PRIVATE_KEY"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.firebase_private_key.secret_id
              key  = "latest"
            }
          }
        }
        env {
          name = "FIREBASE_CLIENT_EMAIL"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.firebase_client_email.secret_id
              key  = "latest"
            }
          }
        }

        env {
          name = "STRIPE_PROD_SECRET_KEY" # Using TEST key name as placeholder based on your previous code context, change to STRIPE_DEPLOYMENT_SECRET_KEY if needed in code
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.stripe_secret_key.secret_id
              key  = "latest"
            }
          }
        }
        env {
            name = "STRIPE_WEBHOOK_SECRET"
            value_from {
                secret_key_ref {
                    name = google_secret_manager_secret.stripe_webhook_secret.secret_id
                    key = "latest"
                }
            }
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [google_project_service.run_api]
}

# Step 4: Control the Heat (Traffic & Access)
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.backend.name
  location = google_cloud_run_service.backend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
