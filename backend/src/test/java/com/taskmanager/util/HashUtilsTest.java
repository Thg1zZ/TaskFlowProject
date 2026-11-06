package com.taskmanager.util;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class HashUtilsTest {

    private HashUtils hashUtilsTrusting(String trustedProxies) {
        HashUtils hashUtils = new HashUtils();
        ReflectionTestUtils.setField(hashUtils, "trustedProxiesRaw", trustedProxies);
        hashUtils.loadTrustedProxies();
        return hashUtils;
    }

    private MockHttpServletRequest request(String remoteAddr, String forwardedFor) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(remoteAddr);
        if (forwardedFor != null) {
            request.addHeader("X-Forwarded-For", forwardedFor);
        }
        return request;
    }

    @Test
    void usesRemoteAddrWhenNoProxyIsTrusted() {
        HashUtils hashUtils = hashUtilsTrusting("");

        assertThat(hashUtils.extractClientIp(request("10.1.2.3", "203.0.113.7")))
                .isEqualTo("10.1.2.3");
    }

    @Test
    void usesFirstForwardedIpWhenRemoteAddrIsInTrustedRange() {
        HashUtils hashUtils = hashUtilsTrusting("10.0.0.0/8, 192.168.0.0/16");

        assertThat(hashUtils.extractClientIp(request("10.1.2.3", "203.0.113.7, 76.76.21.21")))
                .isEqualTo("203.0.113.7");
    }

    @Test
    void resolvesClientBehindVercelAndCloudflare() {
        HashUtils hashUtils = hashUtilsTrusting("172.64.0.0/13");

        assertThat(hashUtils.extractClientIp(request("172.69.138.10", "179.218.18.20, 54.232.129.30")))
                .isEqualTo("179.218.18.20");
    }

    @Test
    void ignoresForwardedHeaderFromUntrustedAddress() {
        HashUtils hashUtils = hashUtilsTrusting("10.0.0.0/8");

        assertThat(hashUtils.extractClientIp(request("198.51.100.9", "1.2.3.4")))
                .isEqualTo("198.51.100.9");
    }

    @Test
    void ipHashDependsOnSecretAndIsNotPlainSha256() {
        HashUtils first = hashUtilsTrusting("");
        ReflectionTestUtils.setField(first, "jwtSecret", "segredo-um-com-mais-de-32-caracteres");
        HashUtils second = hashUtilsTrusting("");
        ReflectionTestUtils.setField(second, "jwtSecret", "segredo-dois-com-mais-de-32-caracteres");

        String ip = "179.218.18.20";
        assertThat(first.hmacSha256Hex(ip))
                .isEqualTo(first.hmacSha256Hex(ip))
                .isNotEqualTo(HashUtils.sha256Hex(ip))
                .isNotEqualTo(second.hmacSha256Hex(ip))
                .hasSize(64);
    }

    @Test
    void fallsBackToRemoteAddrWhenTrustedProxySendsNoHeader() {
        HashUtils hashUtils = hashUtilsTrusting("10.0.0.0/8");

        assertThat(hashUtils.extractClientIp(request("10.1.2.3", null)))
                .isEqualTo("10.1.2.3");
    }
}
