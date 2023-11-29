# Start from the latest Golang base image
FROM golang:alpine

# Install Git (might be already included in the golang image, but just to be sure)
RUN apt-get update && apt-get install -y git

# Install Subfinder
RUN go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest

# Set the entrypoint to the subfinder command
ENTRYPOINT ["subfinder"]
