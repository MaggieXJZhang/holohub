# SPDX-FileCopyrightText: Copyright (c) 2022-2023 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

cmake_minimum_required(VERSION 3.20)
project(endoscopy_tool_tracking CXX)

find_package(holoscan 0.5 REQUIRED CONFIG
             PATHS "/opt/nvidia/holoscan" "/workspace/holoscan-sdk/install")

add_executable(endoscopy_tool_tracking
  main.cpp
)

target_link_libraries(endoscopy_tool_tracking
  PRIVATE
  holoscan::core
  holoscan::ops::aja
  holoscan::ops::video_stream_replayer
  holoscan::ops::video_stream_recorder
  holoscan::ops::format_converter
  holoscan::ops::holoviz
  lstm_tensor_rt_inference
  tool_tracking_postprocessor
)

target_link_libraries(endoscopy_tool_tracking PRIVATE $<TARGET_NAME_IF_EXISTS:holoscan::videomaster>)

# Download the associated dataset if needed
option(HOLOHUB_DOWNLOAD_DATASETS "Download datasets" ON)
if(HOLOHUB_DOWNLOAD_DATASETS)
  add_dependencies(endoscopy_tool_tracking endoscopy_data)
endif()

# Copy the config to the binary directory
add_custom_target(endoscopy_tool_tracking_deps
  COMMAND ${CMAKE_COMMAND} -E copy_if_different "${CMAKE_CURRENT_SOURCE_DIR}/endoscopy_tool_tracking.yaml" ${CMAKE_CURRENT_BINARY_DIR}
  DEPENDS "endoscopy_tool_tracking.yaml"
  BYPRODUCTS "endoscopy_tool_tracking.yaml"
)
add_dependencies(endoscopy_tool_tracking endoscopy_tool_tracking_deps)

# Add testing
if(BUILD_TESTING)
  # Configure the yaml file to only play 10 frames
  file(READ "${CMAKE_CURRENT_SOURCE_DIR}/endoscopy_tool_tracking.yaml" CONFIG_FILE)
  string(REGEX REPLACE "^source:[^\n]*" "^source: replayer" CONFIG_FILE ${CONFIG_FILE})
  string(REPLACE "count: 0" "count: 10" CONFIG_FILE ${CONFIG_FILE})
  file(WRITE "${CMAKE_CURRENT_BINARY_DIR}/endoscopy_tool_tracking_testing.yaml" ${CONFIG_FILE})

  # Add test
  add_test(NAME endoscopy_tool_tracking_cpp_test
           COMMAND endoscopy_tool_tracking ${CMAKE_CURRENT_BINARY_DIR}/endoscopy_tool_tracking_testing.yaml
                   --data "${HOLOHUB_DATA_DIR}/endoscopy"
           WORKING_DIRECTORY ${CMAKE_BINARY_DIR})
  set_tests_properties(endoscopy_tool_tracking_cpp_test PROPERTIES
                       PASS_REGULAR_EXPRESSION "Reach end of file or playback count reaches to the limit. Stop ticking."
                       FAIL_REGULAR_EXPRESSION "[^a-z]Error;ERROR;Failed")
endif()

# Flow benchmarking
if(FLOW_BENCHMARKING)
  # Patch the current source file
  file(READ "${CMAKE_CURRENT_SOURCE_DIR}/main.cpp" MAIN_CPP_FILE)
  string(REGEX REPLACE "^(.*holoscan::Application.*)" "#include \"benchmark.hpp\"\\n\\1" MAIN_CPP_FILE "${MAIN_CPP_FILE}")
  string(REPLACE "holoscan::Application" "BenchmarkedApplication" MAIN_CPP_FILE "${MAIN_CPP_FILE}")
  file(WRITE "${CMAKE_CURRENT_BINARY_DIR}/main_benchmark.cpp" "${MAIN_CPP_FILE}")

  # Create a new executable
  add_executable(endoscopy_tool_tracking_flowbenchmark ${CMAKE_CURRENT_BINARY_DIR}/main_benchmark.cpp)
  get_target_property(ENDOSCOPY_LINK_LIBRARIES endoscopy_tool_tracking LINK_LIBRARIES)
  target_link_libraries(endoscopy_tool_tracking_flowbenchmark PRIVATE ${ENDOSCOPY_LINK_LIBRARIES})
  target_include_directories(endoscopy_tool_tracking_flowbenchmark
                             PRIVATE "${CMAKE_SOURCE_DIR}/tutorials/holoscan_flow_benchmarking")

  # Add the test
  add_test(NAME endoscopy_tool_tracking_cpp_benchmark_test
           COMMAND bash -c "python3 ${CMAKE_SOURCE_DIR}/tutorials/holoscan_flow_benchmarking/benchmark.py \
                     --run-command \"applications/endoscopy_tool_tracking/cpp/endoscopy_tool_tracking_flowbenchmark --data ${HOLOHUB_DATA_DIR}/endoscopy\" \
                     -r 3 -i 3 -m 200 --sched greedy -d ${FLOW_BENCHMARK_DIR}/endoscopy_tool_tracking \
                     && python3 ${CMAKE_SOURCE_DIR}/tutorials/holoscan_flow_benchmarking/analyze.py \
                     -m -a --stddev --median --min --cdash \
                     --draw-cdf ${FLOW_BENCHMARK_DIR}/endoscopy_tool_tracking/single_path_cdf.png --no-display-graphs \
                     -g ${FLOW_BENCHMARK_DIR}/endoscopy_tool_tracking/logger_greedy_* EndoscopyToolTracking"
           WORKING_DIRECTORY ${CMAKE_BINARY_DIR})
endif()
