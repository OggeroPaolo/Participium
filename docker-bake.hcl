variable "REGISTRY" {
  default = "kaanakarcay/participium"
}

group "default" {
  targets = [
    "backend",
    "frontend",
  ]
}

target "backend" {
  context    = "./Back-end"
  dockerfile = "Dockerfile"
  tags = [
    "${REGISTRY}:backend",
  ]
  platforms = [
    "linux/amd64",
    "linux/arm64",
  ]
}

target "frontend" {
  context    = "./Front-end"
  dockerfile = "Dockerfile"
  tags = [
    "${REGISTRY}:frontend",
  ]
  platforms = [
    "linux/amd64",
    "linux/arm64",
  ]
}

