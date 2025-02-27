# H264 Endoscopy Tool Tracking Application

The application showcases how to use H.264 video source as input to and output
from the Holoscan pipeline. This application is a modified version of Endoscopy
Tool Tracking reference application in Holoscan SDK that supports H.264
elementary streams as the input and output.

_The H.264 video decode operators do not adjust framerate as it reads the elementary
stream input. As a result the video stream will be displayed as quickly as the decoding can be
performed. This feature will be coming soon to a new version of the operator._

## Requirements

This application is configured to use H.264 elementary stream from endoscopy
sample data as input. The recording of the output can be enabled by setting
`record_output` flag in the config file to `true`. If the `record_output` flag
in the config file is set to `true`, the output of the pipeline is again
recorded to a H.264 elementary stream on the disk, file name / path for this
can be specified in the 'h264_endoscopy_tool_tracking.yaml' file.

### Data

[📦️ (NGC) Sample App Data for AI-based Endoscopy Tool Tracking](https://catalog.ngc.nvidia.com/orgs/nvidia/teams/clara-holoscan/resources/holoscan_endoscopy_sample_data)

The data is automatically downloaded when building the application.

## Building the application

Please refer to the top level Holohub README.md file for information on how to build this application.

## Running the application

* Running the application `h264_endoscopy_tool_tracking` from the build directory.

```bash
cd <build_dir>/applications/h264_endoscopy_tool_tracking/ \
  && ./h264_endoscopy_tool_tracking --data <HOLOHUB_DATA_DIR>/endoscopy
```

* Running the application from the top level directory

```bash
./run launch h264_endoscopy_tool_tracking
```

## Enable recording of the output

The recording of the output can be enabled by setting `record_output` flag in
the config file
`<build_dir>/applications/h264_endoscopy_tool_tracking/h264_endoscopy_tool_tracking.yaml`
to `true`.

