variable "VERSION" { default = "dev" }
variable "COMMIT" { default = "unknown" }
variable "DATE" { default = "unknown" }
variable "INTEGRATED_BUILD_IMAGE" { default = "multica-integrated:dev" }

group "default" { targets = ["integrated"] }

target "backend" {
  context = "."
  dockerfile = "Dockerfile"
  args = { VERSION = VERSION, COMMIT = COMMIT, DATE = DATE }
}

target "web" {
  context = "."
  dockerfile = "Dockerfile.web"
  args = { NEXT_PUBLIC_APP_VERSION = VERSION }
}

target "integrated" {
  context = "."
  dockerfile = "Dockerfile.integrated"
  contexts = {
    backend-runtime = "target:backend"
    web-runtime = "target:web"
  }
  args = { BACKEND_IMAGE = "backend-runtime", WEB_IMAGE = "web-runtime" }
  tags = [INTEGRATED_BUILD_IMAGE]
  labels = {
    "org.opencontainers.image.title" = "Multica"
    "org.opencontainers.image.version" = VERSION
    "org.opencontainers.image.revision" = COMMIT
  }
}
